import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JournalRefType, PaymentMode } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';
import { PostingService } from '../finance/posting.service';
import {
  CreateCustomerPaymentDto,
  CreateFactoryPaymentDto,
  CreateGeneralExpenseDto,
  CreateTruckExpenseDto,
  CreateTruckPaymentDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posting: PostingService,
  ) {}

  // ── Customer payments ───────────────────────────────────────────────
  async createCustomerPayment(orgId: string, userId: string, dto: CreateCustomerPaymentDto) {
    await this.assertCustomer(orgId, dto.customerId);
    if (dto.orderId) await this.assertOrder(orgId, dto.orderId);
    const paymentDate = new Date(dto.paymentDate);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.customerPayment.create({
        data: {
          orgId,
          customerId: dto.customerId,
          orderId: dto.orderId,
          amountPaise: dto.amountPaise,
          paymentMode: dto.paymentMode as PaymentMode,
          paymentType: dto.paymentType,
          receivedById: dto.receivedById ?? userId,
          paymentDate,
          chequeNumber: dto.chequeNumber,
          upiRef: dto.upiRef,
          bankRef: dto.bankRef,
          proofUrl: dto.proofUrl,
          remarks: dto.remarks,
        },
      });
      await this.posting.postCustomerPayment(tx, {
        orgId,
        paymentId: payment.id,
        customerId: dto.customerId,
        allocatedToOrder: Boolean(dto.orderId),
        mode: dto.paymentMode as PaymentMode,
        amountPaise: dto.amountPaise,
        entryDate: paymentDate,
        createdById: userId,
      });
      return payment;
    });
  }

  listCustomerPayments(orgId: string, filter: { customerId?: string; orderId?: string }) {
    return this.prisma.customerPayment.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(filter.customerId ? { customerId: filter.customerId } : {}),
        ...(filter.orderId ? { orderId: filter.orderId } : {}),
      },
      orderBy: { paymentDate: 'desc' },
      include: { order: { select: { orderNumber: true } } },
    });
  }

  async removeCustomerPayment(orgId: string, userId: string, id: string) {
    const payment = await this.prisma.customerPayment.findFirst({
      where: { id, orgId, deletedAt: null },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.customerPayment.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.posting.reverse(tx, {
        orgId,
        refType: JournalRefType.CUSTOMER_PAYMENT,
        refId: id,
        entryDate: new Date(),
        reason: 'customer payment deleted',
        createdById: userId,
      });
    });
    return { ok: true };
  }

  // ── Factory payments ────────────────────────────────────────────────
  async createFactoryPayment(orgId: string, userId: string, dto: CreateFactoryPaymentDto) {
    await this.assertFactory(orgId, dto.factoryId);
    if (dto.orderId) await this.assertOrder(orgId, dto.orderId);
    const paymentDate = new Date(dto.paymentDate);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.factoryPayment.create({
        data: {
          orgId,
          factoryId: dto.factoryId,
          orderId: dto.orderId,
          amountPaise: dto.amountPaise,
          paymentMode: dto.paymentMode as PaymentMode,
          paymentType: dto.paymentType,
          paidById: dto.paidById ?? userId,
          paymentDate,
          chequeNumber: dto.chequeNumber,
          upiRef: dto.upiRef,
          bankRef: dto.bankRef,
          proofUrl: dto.proofUrl,
          remarks: dto.remarks,
        },
      });
      await this.posting.postFactoryPayment(tx, {
        orgId,
        paymentId: payment.id,
        factoryId: dto.factoryId,
        allocatedToOrder: Boolean(dto.orderId),
        mode: dto.paymentMode as PaymentMode,
        amountPaise: dto.amountPaise,
        entryDate: paymentDate,
        createdById: userId,
      });
      return payment;
    });
  }

  listFactoryPayments(orgId: string, filter: { factoryId?: string; orderId?: string }) {
    return this.prisma.factoryPayment.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(filter.factoryId ? { factoryId: filter.factoryId } : {}),
        ...(filter.orderId ? { orderId: filter.orderId } : {}),
      },
      orderBy: { paymentDate: 'desc' },
      include: { order: { select: { orderNumber: true } } },
    });
  }

  async removeFactoryPayment(orgId: string, userId: string, id: string) {
    const payment = await this.prisma.factoryPayment.findFirst({
      where: { id, orgId, deletedAt: null },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.factoryPayment.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.posting.reverse(tx, {
        orgId,
        refType: JournalRefType.FACTORY_PAYMENT,
        refId: id,
        entryDate: new Date(),
        reason: 'factory payment deleted',
        createdById: userId,
      });
    });
    return { ok: true };
  }

  // ── Hired truck payments ────────────────────────────────────────────
  async createTruckPayment(orgId: string, userId: string, dto: CreateTruckPaymentDto) {
    await this.assertHiredTruck(orgId, dto.hiredTruckId);
    const paymentDate = new Date(dto.paymentDate);
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.truckPayment.create({
        data: {
          orgId,
          hiredTruckId: dto.hiredTruckId,
          orderId: dto.orderId,
          amountPaise: dto.amountPaise,
          paymentMode: dto.paymentMode as PaymentMode,
          paymentDate,
          remarks: dto.remarks,
          createdById: userId,
        },
      });
      await this.posting.postTruckPayment(tx, {
        orgId,
        paymentId: payment.id,
        hiredTruckId: dto.hiredTruckId,
        mode: dto.paymentMode as PaymentMode,
        amountPaise: dto.amountPaise,
        entryDate: paymentDate,
        createdById: userId,
      });
      return payment;
    });
  }

  listTruckPayments(orgId: string, filter: { hiredTruckId?: string }) {
    return this.prisma.truckPayment.findMany({
      where: { orgId, deletedAt: null, ...(filter.hiredTruckId ? { hiredTruckId: filter.hiredTruckId } : {}) },
      orderBy: { paymentDate: 'desc' },
    });
  }

  // ── Truck expenses (own trucks) ─────────────────────────────────────
  async createTruckExpense(orgId: string, userId: string, dto: CreateTruckExpenseDto) {
    await this.assertOwnTruck(orgId, dto.ownTruckId);
    const expenseDate = new Date(dto.expenseDate);
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.truckExpense.create({
        data: {
          orgId,
          ownTruckId: dto.ownTruckId,
          expenseType: dto.expenseType,
          amountPaise: dto.amountPaise,
          expenseDate,
          description: dto.description,
          proofUrl: dto.proofUrl,
          createdById: userId,
        },
      });
      await this.posting.postTruckExpense(tx, {
        orgId,
        expenseId: expense.id,
        ownTruckId: dto.ownTruckId,
        amountPaise: dto.amountPaise,
        entryDate: expenseDate,
        description: `Truck ${dto.expenseType.toLowerCase()}`,
        createdById: userId,
      });
      return expense;
    });
  }

  listTruckExpenses(orgId: string, filter: { ownTruckId?: string }) {
    return this.prisma.truckExpense.findMany({
      where: { orgId, deletedAt: null, ...(filter.ownTruckId ? { ownTruckId: filter.ownTruckId } : {}) },
      orderBy: { expenseDate: 'desc' },
      include: { ownTruck: { select: { number: true } } },
    });
  }

  async removeTruckExpense(orgId: string, userId: string, id: string) {
    const expense = await this.prisma.truckExpense.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!expense) throw new NotFoundException('Expense not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.truckExpense.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.posting.reverse(tx, {
        orgId,
        refType: JournalRefType.TRUCK_EXPENSE,
        refId: id,
        entryDate: new Date(),
        reason: 'truck expense deleted',
        createdById: userId,
      });
    });
    return { ok: true };
  }

  // ── General expenses ────────────────────────────────────────────────
  async createGeneralExpense(orgId: string, userId: string, dto: CreateGeneralExpenseDto) {
    const expenseDate = new Date(dto.expenseDate);
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.generalExpense.create({
        data: {
          orgId,
          category: dto.category,
          amountPaise: dto.amountPaise,
          expenseDate,
          description: dto.description,
          proofUrl: dto.proofUrl,
          createdById: userId,
        },
      });
      await this.posting.postGeneralExpense(tx, {
        orgId,
        expenseId: expense.id,
        amountPaise: dto.amountPaise,
        entryDate: expenseDate,
        description: dto.category,
        createdById: userId,
      });
      return expense;
    });
  }

  listGeneralExpenses(orgId: string) {
    return this.prisma.generalExpense.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { expenseDate: 'desc' },
    });
  }

  async removeGeneralExpense(orgId: string, userId: string, id: string) {
    const expense = await this.prisma.generalExpense.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!expense) throw new NotFoundException('Expense not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.generalExpense.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.posting.reverse(tx, {
        orgId,
        refType: JournalRefType.GENERAL_EXPENSE,
        refId: id,
        entryDate: new Date(),
        reason: 'general expense deleted',
        createdById: userId,
      });
    });
    return { ok: true };
  }

  // ── Reference guards ────────────────────────────────────────────────
  private async assertCustomer(orgId: string, id: string) {
    const c = await this.prisma.customer.findFirst({ where: { id, orgId, deletedAt: null }, select: { id: true } });
    if (!c) throw new BadRequestException('Customer not found');
  }
  private async assertFactory(orgId: string, id: string) {
    const f = await this.prisma.factory.findFirst({ where: { id, orgId, deletedAt: null }, select: { id: true } });
    if (!f) throw new BadRequestException('Factory not found');
  }
  private async assertOrder(orgId: string, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, orgId, deletedAt: null }, select: { id: true } });
    if (!o) throw new BadRequestException('Order not found');
  }
  private async assertHiredTruck(orgId: string, id: string) {
    const t = await this.prisma.hiredTruck.findFirst({ where: { id, orgId, deletedAt: null }, select: { id: true } });
    if (!t) throw new BadRequestException('Hired truck not found');
  }
  private async assertOwnTruck(orgId: string, id: string) {
    const t = await this.prisma.ownTruck.findFirst({ where: { id, orgId, deletedAt: null }, select: { id: true } });
    if (!t) throw new BadRequestException('Own truck not found');
  }
}
