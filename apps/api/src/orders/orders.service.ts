import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@brick/db';
import {
  DEFAULT_ORG_SETTINGS,
  ORDER_STATUS_TRANSITIONS,
  type OrderStatus,
  type OrgSettings,
} from '@brick/types';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { nextOrderNumber } from './order-number.util';
import { computeOrderSummary } from './order-financials.util';
import {
  CreateOrderDto,
  OrderListQueryDto,
  TransitionOrderDto,
  UpdateOrderDto,
} from './dto/order.dto';

type Tx = Prisma.TransactionClient;

const ORDER_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  factory: { select: { id: true, name: true } },
  ownTruck: { select: { id: true, number: true } },
  hiredTruck: { select: { id: true, number: true, ownerName: true } },
  driver: { select: { id: true, name: true } },
  customerAddress: true,
  stockItems: {
    include: { stockBatch: { select: { id: true, brickClass: true, purchaseDate: true } } },
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create ────────────────────────────────────────────────────────────
  async create(orgId: string, userId: string, dto: CreateOrderDto) {
    const isStock = dto.orderType === 'STOCK';
    await this.validateRefs(orgId, {
      customerId: dto.customerId,
      customerAddressId: dto.customerAddressId,
      factoryId: isStock ? undefined : dto.factoryId,
      ownTruckId: dto.ownTruckId,
      hiredTruckId: dto.hiredTruckId,
      driverId: dto.driverId,
    });

    if (!isStock) {
      if (!dto.factoryId) throw new BadRequestException('Direct order needs a factory');
      if (dto.qtyOrdered == null) throw new BadRequestException('Direct order needs a quantity');
      if (dto.purchasePricePerBrickPaise == null)
        throw new BadRequestException('Direct order needs a purchase price');
    } else if (!dto.stockItems?.length) {
      throw new BadRequestException('Stock order needs at least one batch');
    }
    if (dto.truckType === 'HIRED' && !dto.hiredTruckId)
      throw new BadRequestException('Hired truck required for hired transport');

    const { settings } = await this.getOrgContext(orgId);
    const orderDate = new Date(dto.orderDate);
    const year = orderDate.getFullYear();
    const confirmNow = dto.status === 'CONFIRMED';

    return this.withCollisionRetry(() =>
      this.prisma.$transaction(async (tx) => {
        // Resolve stock items (snapshot batch purchase price) + qty.
        let qtyOrdered = dto.qtyOrdered ?? 0;
        let stockItemsCreate: Prisma.OrderStockItemCreateWithoutOrderInput[] = [];
        if (isStock) {
          qtyOrdered = 0;
          for (const item of dto.stockItems!) {
            const batch = await tx.stockBatch.findFirst({
              where: { id: item.stockBatchId, orgId, deletedAt: null },
            });
            if (!batch) throw new BadRequestException(`Stock batch ${item.stockBatchId} not found`);
            if (batch.brickClass !== dto.brickClass)
              throw new BadRequestException('Selected batch does not match the brick class');
            qtyOrdered += item.qtyTaken;
            stockItemsCreate.push({
              stockBatch: { connect: { id: batch.id } },
              qtyTaken: item.qtyTaken,
              purchasePricePerBrickPaise: batch.purchasePricePerBrickPaise,
            });
          }
        }

        const orderNumber = await nextOrderNumber(tx, orgId, settings.orderNumberPrefix, year);

        const order = await tx.order.create({
          data: {
            orgId,
            orderNumber,
            orderType: dto.orderType,
            status: confirmNow ? 'CONFIRMED' : 'DRAFT',
            customerId: dto.customerId,
            customerAddressId: dto.customerAddressId,
            factoryId: isStock ? null : dto.factoryId,
            brickClass: dto.brickClass,
            qtyOrdered,
            purchasePricePerBrickPaise: isStock ? null : dto.purchasePricePerBrickPaise,
            sellingPricePerBrickPaise: dto.sellingPricePerBrickPaise,
            truckType: dto.truckType,
            ownTruckId: dto.ownTruckId,
            hiredTruckId: dto.hiredTruckId,
            driverId: dto.driverId,
            truckChargesPaise: dto.truckType === 'HIRED' ? (dto.truckChargesPaise ?? 0) : 0,
            isGst: dto.isGst ?? false,
            gstRate: dto.isGst ? (dto.gstRate ?? settings.defaultGstRate) : 0,
            orderDate,
            deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
            deliveryLocation: dto.deliveryLocation,
            notes: dto.notes,
            createdById: userId,
            updatedById: userId,
            stockItems: isStock ? { create: stockItemsCreate } : undefined,
          },
          include: ORDER_INCLUDE,
        });

        if (confirmNow && isStock) {
          for (const item of order.stockItems) {
            await this.reserveBatch(tx, item.stockBatchId, item.qtyTaken);
          }
        }
        return order;
      }),
    ).then((order) => this.attachSummary(orgId, order, settings));
  }

  // ── Read ──────────────────────────────────────────────────────────────
  async findAll(orgId: string, query: OrderListQueryDto) {
    const where: Prisma.OrderWhereInput = {
      orgId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.orderType ? { orderType: query.orderType } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.factoryId ? { factoryId: query.factoryId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            orderDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const { settings } = await this.getOrgContext(orgId);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { orderDate: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);
    // Totals are independent of intra/inter-state, so interState=false is safe here.
    const data = rows.map((o) => ({ ...o, summary: computeOrderSummary(o, settings, false) }));
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(orgId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, orgId, deletedAt: null },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Order not found');
    const { settings, orgState } = await this.getOrgContext(orgId);
    const interState = this.isInterState(orgState, order.customerAddress?.state ?? null);
    return { ...order, summary: computeOrderSummary(order, settings, interState) };
  }

  // ── Update (DRAFT only) ───────────────────────────────────────────────
  async update(orgId: string, userId: string, id: string, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true, status: true, orderType: true, customerId: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'DRAFT')
      throw new BadRequestException('Only draft orders can be edited');

    await this.validateRefs(orgId, {
      customerId: dto.customerId,
      customerAddressId: dto.customerAddressId,
      addressOwnerId: dto.customerId ?? order.customerId,
      factoryId: dto.factoryId,
      ownTruckId: dto.ownTruckId,
      hiredTruckId: dto.hiredTruckId,
      driverId: dto.driverId,
    });

    const data: Prisma.OrderUpdateInput = {
      brickClass: dto.brickClass,
      qtyOrdered: order.orderType === 'STOCK' ? undefined : dto.qtyOrdered,
      purchasePricePerBrickPaise: dto.purchasePricePerBrickPaise,
      sellingPricePerBrickPaise: dto.sellingPricePerBrickPaise,
      truckType: dto.truckType,
      truckChargesPaise: dto.truckChargesPaise,
      isGst: dto.isGst,
      gstRate: dto.gstRate,
      deliveryLocation: dto.deliveryLocation,
      notes: dto.notes,
      orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
      deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
      updatedBy: { connect: { id: userId } },
      ...(dto.customerId ? { customer: { connect: { id: dto.customerId } } } : {}),
      ...(dto.customerAddressId
        ? { customerAddress: { connect: { id: dto.customerAddressId } } }
        : {}),
      ...(dto.factoryId ? { factory: { connect: { id: dto.factoryId } } } : {}),
      ...(dto.ownTruckId ? { ownTruck: { connect: { id: dto.ownTruckId } } } : {}),
      ...(dto.hiredTruckId ? { hiredTruck: { connect: { id: dto.hiredTruckId } } } : {}),
      ...(dto.driverId ? { driver: { connect: { id: dto.driverId } } } : {}),
    };
    await this.prisma.order.update({ where: { id }, data });
    return this.findOne(orgId, id);
  }

  // ── Status lifecycle ──────────────────────────────────────────────────
  async transition(orgId: string, userId: string, id: string, dto: TransitionOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: { id, orgId, deletedAt: null },
      include: { stockItems: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const allowed = ORDER_STATUS_TRANSITIONS[order.status as OrderStatus];
    if (!allowed.includes(dto.status as OrderStatus))
      throw new BadRequestException(`Cannot move order from ${order.status} to ${dto.status}`);

    const isStock = order.orderType === 'STOCK';
    const wasReserved = order.status === 'CONFIRMED' || order.status === 'IN_TRANSIT';

    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.OrderUpdateInput = {
        status: dto.status,
        version: { increment: 1 },
        updatedBy: { connect: { id: userId } },
      };

      if (dto.status === 'CONFIRMED' && isStock) {
        for (const item of order.stockItems) {
          await this.reserveBatch(tx, item.stockBatchId, item.qtyTaken);
        }
      } else if (dto.status === 'DELIVERED') {
        const qtyDelivered = isStock ? order.qtyOrdered : (dto.qtyDelivered ?? order.qtyOrdered);
        if (qtyDelivered > order.qtyOrdered)
          throw new BadRequestException('Delivered quantity cannot exceed ordered quantity');
        data.qtyDelivered = qtyDelivered;
        data.qtyDiscrepancy = dto.qtyDiscrepancy ?? 0;
        data.actualDeliveryAt = dto.actualDeliveryAt ? new Date(dto.actualDeliveryAt) : new Date();
        if (isStock) {
          for (const item of order.stockItems) {
            await this.sellBatch(tx, item.stockBatchId, item.qtyTaken);
          }
        }
      } else if (dto.status === 'CANCELLED' && isStock && wasReserved) {
        for (const item of order.stockItems) {
          await this.releaseBatch(tx, item.stockBatchId, item.qtyTaken);
        }
      }

      await tx.order.update({ where: { id }, data });
    });

    return this.findOne(orgId, id);
  }

  // ── Stock movement helpers ────────────────────────────────────────────
  private async reserveBatch(tx: Tx, batchId: string, qty: number) {
    const batch = await tx.stockBatch.findUniqueOrThrow({ where: { id: batchId } });
    const available = batch.qtyPurchased - batch.qtySold - batch.qtyReserved;
    if (available < qty)
      throw new BadRequestException(
        `Not enough stock in a batch: need ${qty}, available ${available}`,
      );
    await tx.stockBatch.update({
      where: { id: batchId },
      data: { qtyReserved: { increment: qty } },
    });
  }

  private async sellBatch(tx: Tx, batchId: string, qty: number) {
    await tx.stockBatch.update({
      where: { id: batchId },
      data: { qtyReserved: { decrement: qty }, qtySold: { increment: qty } },
    });
  }

  private async releaseBatch(tx: Tx, batchId: string, qty: number) {
    await tx.stockBatch.update({
      where: { id: batchId },
      data: { qtyReserved: { decrement: qty } },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private async getOrgContext(orgId: string): Promise<{ settings: OrgSettings; orgState: string | null }> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    return {
      settings: { ...DEFAULT_ORG_SETTINGS, ...((org?.settings as Partial<OrgSettings>) ?? {}) },
      orgState: org?.state ?? null,
    };
  }

  private isInterState(orgState: string | null, customerState: string | null): boolean {
    if (!orgState || !customerState) return false;
    return orgState.trim().toLowerCase() !== customerState.trim().toLowerCase();
  }

  private async attachSummary(
    orgId: string,
    order: Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>,
    settings: OrgSettings,
  ) {
    const { orgState } = await this.getOrgContext(orgId);
    const interState = this.isInterState(orgState, order.customerAddress?.state ?? null);
    return { ...order, summary: computeOrderSummary(order, settings, interState) };
  }

  private async validateRefs(
    orgId: string,
    refs: {
      customerId?: string;
      customerAddressId?: string;
      addressOwnerId?: string;
      factoryId?: string;
      ownTruckId?: string;
      hiredTruckId?: string;
      driverId?: string;
    },
  ) {
    if (refs.customerId) {
      const c = await this.prisma.customer.findFirst({
        where: { id: refs.customerId, orgId, deletedAt: null },
        select: { id: true },
      });
      if (!c) throw new BadRequestException('Customer not found');
    }
    if (refs.customerAddressId) {
      const a = await this.prisma.customerAddress.findFirst({
        where: { id: refs.customerAddressId, customerId: refs.addressOwnerId ?? refs.customerId },
        select: { id: true },
      });
      if (!a) throw new BadRequestException('Delivery address not found for this customer');
    }
    if (refs.factoryId) {
      const f = await this.prisma.factory.findFirst({
        where: { id: refs.factoryId, orgId, deletedAt: null },
        select: { id: true },
      });
      if (!f) throw new BadRequestException('Factory not found');
    }
    if (refs.ownTruckId) {
      const t = await this.prisma.ownTruck.findFirst({
        where: { id: refs.ownTruckId, orgId, deletedAt: null },
        select: { id: true },
      });
      if (!t) throw new BadRequestException('Own truck not found');
    }
    if (refs.hiredTruckId) {
      const t = await this.prisma.hiredTruck.findFirst({
        where: { id: refs.hiredTruckId, orgId, deletedAt: null },
        select: { id: true },
      });
      if (!t) throw new BadRequestException('Hired truck not found');
    }
    if (refs.driverId) {
      const d = await this.prisma.driver.findFirst({
        where: { id: refs.driverId, orgId, deletedAt: null },
        select: { id: true },
      });
      if (!d) throw new BadRequestException('Driver not found');
    }
  }

  // Retry order creation if two requests grabbed the same order number.
  private async withCollisionRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        const isCollision =
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002' &&
          (e.meta?.target as string[] | undefined)?.includes('orderNumber');
        if (!isCollision || i === attempts - 1) throw e;
      }
    }
    throw new Error('unreachable');
  }
}
