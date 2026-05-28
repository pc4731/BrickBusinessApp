import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@brick/db';
import { DEFAULT_ORG_SETTINGS, type OrgSettings, BrickClasses } from '@brick/types';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateStockBatchDto, StockQueryDto } from './dto/stock.dto';

const available = (b: { qtyPurchased: number; qtySold: number; qtyReserved: number }) =>
  b.qtyPurchased - b.qtySold - b.qtyReserved;

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async createBatch(orgId: string, dto: CreateStockBatchDto) {
    const factory = await this.prisma.factory.findFirst({
      where: { id: dto.factoryId, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!factory) throw new BadRequestException('Factory not found');

    return this.prisma.stockBatch.create({
      data: {
        orgId,
        factoryId: dto.factoryId,
        brickClass: dto.brickClass,
        qtyPurchased: dto.qtyPurchased,
        purchasePricePerBrickPaise: dto.purchasePricePerBrickPaise,
        purchaseDate: new Date(dto.purchaseDate),
        truckType: dto.truckType,
        ownTruckId: dto.ownTruckId,
        hiredTruckId: dto.hiredTruckId,
        transportCostPaise: dto.transportCostPaise ?? 0,
        notes: dto.notes,
      },
    });
  }

  async findAll(orgId: string, query: StockQueryDto) {
    const where: Prisma.StockBatchWhereInput = {
      orgId,
      deletedAt: null,
      ...(query.brickClass ? { brickClass: query.brickClass } : {}),
      ...(query.factoryId ? { factoryId: query.factoryId } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.stockBatch.findMany({
        where,
        orderBy: { purchaseDate: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: { factory: { select: { id: true, name: true } } },
      }),
      this.prisma.stockBatch.count({ where }),
    ]);
    const data = rows.map((b) => ({ ...b, qtyAvailable: available(b) }));
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(orgId: string, id: string) {
    const batch = await this.prisma.stockBatch.findFirst({
      where: { id, orgId, deletedAt: null },
      include: { factory: { select: { id: true, name: true } } },
    });
    if (!batch) throw new NotFoundException('Stock batch not found');
    return { ...batch, qtyAvailable: available(batch) };
  }

  /** Per-brick-class stock position with low-stock flags. */
  async summary(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    const settings = { ...DEFAULT_ORG_SETTINGS, ...((org?.settings as Partial<OrgSettings>) ?? {}) };
    const threshold = settings.lowStockThresholdBricks;

    const grouped = await this.prisma.stockBatch.groupBy({
      by: ['brickClass'],
      where: { orgId, deletedAt: null },
      _sum: { qtyPurchased: true, qtySold: true, qtyReserved: true },
    });

    const byClass = new Map(grouped.map((g) => [g.brickClass, g._sum]));
    return BrickClasses.map((brickClass) => {
      const s = byClass.get(brickClass);
      const purchased = s?.qtyPurchased ?? 0;
      const sold = s?.qtySold ?? 0;
      const reserved = s?.qtyReserved ?? 0;
      const avail = purchased - sold - reserved;
      return {
        brickClass,
        purchased,
        sold,
        reserved,
        available: avail,
        lowStock: avail < threshold,
        threshold,
      };
    });
  }
}
