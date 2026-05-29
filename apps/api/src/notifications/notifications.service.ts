import { Injectable } from '@nestjs/common';
import { NotificationType } from '@brick/db';
import { formatINR } from '@brick/utils';
import { BRICK_CLASS_LABEL } from '@brick/types';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../finance/ledger.service';
import { StockService } from '../stock/stock.service';

interface DesiredAlert {
  type: NotificationType;
  refType: string;
  refId: string;
  title: string;
  body: string;
}

const ALERT_TYPES: NotificationType[] = [
  NotificationType.LOW_STOCK,
  NotificationType.CUSTOMER_PAYMENT_DUE,
  NotificationType.FACTORY_DUE_OVERDUE,
];

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly stock: StockService,
  ) {}

  list(orgId: string) {
    return this.prisma.notification.findMany({
      where: { orgId },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  async unreadCount(orgId: string) {
    const count = await this.prisma.notification.count({ where: { orgId, isRead: false } });
    return { count };
  }

  async markRead(orgId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, orgId }, data: { isRead: true } });
    return { ok: true };
  }

  async markAllRead(orgId: string) {
    await this.prisma.notification.updateMany({ where: { orgId, isRead: false }, data: { isRead: true } });
    return { ok: true };
  }

  /**
   * Recompute the current alert set and reconcile it with stored alerts:
   * new alerts are inserted, resolved ones removed, and still-valid ones keep
   * their read state (body refreshed). User-authored notifications are untouched.
   */
  async refresh(orgId: string) {
    const desired = await this.computeAlerts(orgId);
    const existing = await this.prisma.notification.findMany({
      where: { orgId, type: { in: ALERT_TYPES } },
    });

    const keyOf = (a: { type: NotificationType; refType: string | null; refId: string | null }) =>
      `${a.type}|${a.refType}|${a.refId}`;
    const desiredByKey = new Map(desired.map((d) => [keyOf(d), d]));
    const existingByKey = new Map(existing.map((e) => [keyOf(e), e]));

    const toCreate = desired.filter((d) => !existingByKey.has(keyOf(d)));
    const toDelete = existing.filter((e) => !desiredByKey.has(keyOf(e)));
    const toUpdate = existing.filter((e) => desiredByKey.has(keyOf(e)));

    await this.prisma.$transaction([
      ...toCreate.map((d) =>
        this.prisma.notification.create({
          data: {
            orgId,
            type: d.type,
            channel: 'IN_APP',
            title: d.title,
            body: d.body,
            refType: d.refType,
            refId: d.refId,
          },
        }),
      ),
      ...toUpdate.map((e) =>
        this.prisma.notification.update({
          where: { id: e.id },
          data: { body: desiredByKey.get(keyOf(e))!.body, title: desiredByKey.get(keyOf(e))!.title },
        }),
      ),
      ...(toDelete.length
        ? [this.prisma.notification.deleteMany({ where: { id: { in: toDelete.map((e) => e.id) } } })]
        : []),
    ]);

    return { created: toCreate.length, removed: toDelete.length, total: desired.length };
  }

  /** Refresh alerts for every organisation (used by the scheduled job). */
  async refreshAllOrgs() {
    const orgs = await this.prisma.organization.findMany({ where: { deletedAt: null }, select: { id: true } });
    for (const o of orgs) await this.refresh(o.id);
    return { orgs: orgs.length };
  }

  private async computeAlerts(orgId: string): Promise<DesiredAlert[]> {
    const alerts: DesiredAlert[] = [];

    const stockSummary = await this.stock.summary(orgId);
    for (const s of stockSummary) {
      if (s.lowStock) {
        alerts.push({
          type: NotificationType.LOW_STOCK,
          refType: 'stock',
          refId: s.brickClass,
          title: `Low stock: ${BRICK_CLASS_LABEL[s.brickClass]}`,
          body: `Only ${(s.available / 1000).toFixed(1)}×1000 available (threshold ${(s.threshold / 1000).toFixed(1)}×1000).`,
        });
      }
    }

    const customerDues = await this.ledger.customerDues(orgId);
    for (const c of customerDues) {
      if (c.pendingPaise > 0) {
        alerts.push({
          type: NotificationType.CUSTOMER_PAYMENT_DUE,
          refType: 'customer',
          refId: c.customerId,
          title: `Payment due: ${c.name}`,
          body: `${formatINR(c.pendingPaise)} outstanding from ${c.name}.`,
        });
      }
    }

    const factoryDues = await this.ledger.factoryDues(orgId);
    for (const f of factoryDues) {
      if (f.payablePaise > 0) {
        alerts.push({
          type: NotificationType.FACTORY_DUE_OVERDUE,
          refType: 'factory',
          refId: f.factoryId,
          title: `Payable: ${f.name}`,
          body: `${formatINR(f.payablePaise)} payable to ${f.name}.`,
        });
      }
    }

    return alerts;
  }
}
