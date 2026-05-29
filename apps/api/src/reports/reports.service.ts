import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, LedgerAccount } from '@brick/db';
import { DEFAULT_ORG_SETTINGS, type OrgSettings } from '@brick/types';
import { PrismaService } from '../prisma/prisma.service';
import { computeOrderSummary } from '../orders/order-financials.util';

interface DateRange {
  dateFrom?: string;
  dateTo?: string;
}

const EXPENSE_ACCOUNTS: LedgerAccount[] = [
  LedgerAccount.TRUCK_EXPENSE,
  LedgerAccount.GENERAL_EXPENSE,
];

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const ym = (d: Date) => d.toISOString().slice(0, 7);

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private dateWhere(range: DateRange): Prisma.JournalEntryWhereInput {
    if (!range.dateFrom && !range.dateTo) return {};
    return {
      entryDate: {
        ...(range.dateFrom ? { gte: new Date(range.dateFrom) } : {}),
        ...(range.dateTo ? { lte: new Date(range.dateTo) } : {}),
      },
    };
  }

  private async orgSettings(orgId: string): Promise<{ settings: OrgSettings; state: string | null }> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    return {
      settings: { ...DEFAULT_ORG_SETTINGS, ...((org?.settings as Partial<OrgSettings>) ?? {}) },
      state: org?.state ?? null,
    };
  }

  /** Profit & loss over a date range, derived from the journal. */
  async profitAndLoss(orgId: string, range: DateRange) {
    const entries = await this.prisma.journalEntry.findMany({
      where: { orgId, ...this.dateWhere(range) },
      select: { debitAccount: true, creditAccount: true, amountPaise: true },
    });
    let revenue = 0;
    let cogs = 0;
    let truckExpense = 0;
    let generalExpense = 0;
    let gstOutput = 0;
    for (const e of entries) {
      if (e.creditAccount === LedgerAccount.REVENUE) revenue += e.amountPaise;
      if (e.debitAccount === LedgerAccount.REVENUE) revenue -= e.amountPaise;
      if (e.debitAccount === LedgerAccount.COGS) cogs += e.amountPaise;
      if (e.creditAccount === LedgerAccount.COGS) cogs -= e.amountPaise;
      if (e.debitAccount === LedgerAccount.TRUCK_EXPENSE) truckExpense += e.amountPaise;
      if (e.creditAccount === LedgerAccount.TRUCK_EXPENSE) truckExpense -= e.amountPaise;
      if (e.debitAccount === LedgerAccount.GENERAL_EXPENSE) generalExpense += e.amountPaise;
      if (e.creditAccount === LedgerAccount.GENERAL_EXPENSE) generalExpense -= e.amountPaise;
      if (e.creditAccount === LedgerAccount.GST_OUTPUT_PAYABLE) gstOutput += e.amountPaise;
      if (e.debitAccount === LedgerAccount.GST_OUTPUT_PAYABLE) gstOutput -= e.amountPaise;
    }
    const grossProfit = revenue - cogs;
    const totalExpenses = truckExpense + generalExpense;
    return {
      revenuePaise: revenue,
      cogsPaise: cogs,
      grossProfitPaise: grossProfit,
      truckExpensePaise: truckExpense,
      generalExpensePaise: generalExpense,
      totalExpensesPaise: totalExpenses,
      netProfitPaise: grossProfit - totalExpenses,
      gstOutputPaise: gstOutput,
    };
  }

  /** Per-month revenue / purchase / expense / net profit for trend charts. */
  async monthlyTrends(orgId: string, months = 6) {
    const from = new Date();
    from.setUTCDate(1);
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCMonth(from.getUTCMonth() - (months - 1));

    const entries = await this.prisma.journalEntry.findMany({
      where: { orgId, entryDate: { gte: from } },
      select: { entryDate: true, debitAccount: true, creditAccount: true, amountPaise: true },
    });

    const buckets = new Map<string, { revenue: number; cogs: number; expense: number }>();
    for (let i = 0; i < months; i++) {
      const d = new Date(from);
      d.setUTCMonth(from.getUTCMonth() + i);
      buckets.set(ym(d), { revenue: 0, cogs: 0, expense: 0 });
    }
    for (const e of entries) {
      const key = ym(e.entryDate);
      const b = buckets.get(key);
      if (!b) continue;
      if (e.creditAccount === LedgerAccount.REVENUE) b.revenue += e.amountPaise;
      if (e.debitAccount === LedgerAccount.COGS) b.cogs += e.amountPaise;
      if (EXPENSE_ACCOUNTS.includes(e.debitAccount)) b.expense += e.amountPaise;
    }
    return [...buckets.entries()].map(([month, b]) => ({
      month,
      revenuePaise: b.revenue,
      purchasePaise: b.cogs,
      expensePaise: b.expense,
      netProfitPaise: b.revenue - b.cogs - b.expense,
    }));
  }

  /** Sales per day (from recognised revenue), with order counts. */
  async dailySales(orgId: string, range: DateRange) {
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        orgId,
        refType: 'ORDER',
        ...this.dateWhere(range),
        OR: [
          { creditAccount: LedgerAccount.REVENUE },
          { debitAccount: LedgerAccount.COGS },
          { creditAccount: LedgerAccount.GST_OUTPUT_PAYABLE },
        ],
      },
      select: {
        entryDate: true,
        debitAccount: true,
        creditAccount: true,
        amountPaise: true,
        refId: true,
      },
    });
    const byDay = new Map<string, { sales: number; cogs: number; tax: number; orders: Set<string> }>();
    for (const e of entries) {
      const key = ymd(e.entryDate);
      const b = byDay.get(key) ?? { sales: 0, cogs: 0, tax: 0, orders: new Set<string>() };
      if (e.creditAccount === LedgerAccount.REVENUE) b.sales += e.amountPaise;
      if (e.debitAccount === LedgerAccount.COGS) b.cogs += e.amountPaise;
      if (e.creditAccount === LedgerAccount.GST_OUTPUT_PAYABLE) b.tax += e.amountPaise;
      if (e.refId) b.orders.add(e.refId);
      byDay.set(key, b);
    }
    return [...byDay.entries()]
      .map(([date, b]) => ({
        date,
        orders: b.orders.size,
        salesPaise: b.sales,
        cogsPaise: b.cogs,
        taxPaise: b.tax,
        grossProfitPaise: b.sales - b.cogs,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /** Purchases: stock batches + direct-order COGS within the range. */
  async purchaseRegister(orgId: string, range: DateRange) {
    const dateFilter = (field: string) =>
      range.dateFrom || range.dateTo
        ? { [field]: { ...(range.dateFrom ? { gte: new Date(range.dateFrom) } : {}), ...(range.dateTo ? { lte: new Date(range.dateTo) } : {}) } }
        : {};

    const [batches, directOrders] = await this.prisma.$transaction([
      this.prisma.stockBatch.findMany({
        where: { orgId, deletedAt: null, ...dateFilter('purchaseDate') },
        include: { factory: { select: { name: true } } },
      }),
      this.prisma.order.findMany({
        where: { orgId, deletedAt: null, orderType: 'DIRECT', status: 'DELIVERED', ...dateFilter('actualDeliveryAt') },
        include: { factory: { select: { name: true } } },
      }),
    ]);

    const rows = [
      ...batches.map((b) => ({
        date: ymd(b.purchaseDate),
        type: 'STOCK' as const,
        factory: b.factory?.name ?? '—',
        qtyBricks: b.qtyPurchased,
        amountPaise: b.qtyPurchased * b.purchasePricePerBrickPaise,
      })),
      ...directOrders.map((o) => ({
        date: o.actualDeliveryAt ? ymd(o.actualDeliveryAt) : ymd(o.orderDate),
        type: 'DIRECT' as const,
        factory: o.factory?.name ?? '—',
        qtyBricks: o.qtyDelivered ?? o.qtyOrdered,
        amountPaise: (o.qtyDelivered ?? o.qtyOrdered) * (o.purchasePricePerBrickPaise ?? 0),
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    const totalPaise = rows.reduce((s, r) => s + r.amountPaise, 0);
    return { rows, totalPaise };
  }

  /** Customer receipts + factory/truck payments within the range. */
  async paymentReport(orgId: string, range: DateRange) {
    const within = (range.dateFrom || range.dateTo)
      ? { paymentDate: { ...(range.dateFrom ? { gte: new Date(range.dateFrom) } : {}), ...(range.dateTo ? { lte: new Date(range.dateTo) } : {}) } }
      : {};
    const [received, paid] = await this.prisma.$transaction([
      this.prisma.customerPayment.findMany({
        where: { orgId, deletedAt: null, ...within },
        include: { customer: { select: { name: true } } },
      }),
      this.prisma.factoryPayment.findMany({
        where: { orgId, deletedAt: null, ...within },
        include: { factory: { select: { name: true } } },
      }),
    ]);
    const rows = [
      ...received.map((p) => ({
        date: ymd(p.paymentDate),
        direction: 'IN' as const,
        party: p.customer?.name ?? '—',
        mode: p.paymentMode,
        amountPaise: p.amountPaise,
      })),
      ...paid.map((p) => ({
        date: ymd(p.paymentDate),
        direction: 'OUT' as const,
        party: p.factory?.name ?? '—',
        mode: p.paymentMode,
        amountPaise: p.amountPaise,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    const receivedPaise = received.reduce((s, p) => s + p.amountPaise, 0);
    const paidPaise = paid.reduce((s, p) => s + p.amountPaise, 0);
    return { rows, receivedPaise, paidPaise, netPaise: receivedPaise - paidPaise };
  }

  /** Truck + general expenses within the range. */
  async expenseReport(orgId: string, range: DateRange) {
    const within = (range.dateFrom || range.dateTo)
      ? { expenseDate: { ...(range.dateFrom ? { gte: new Date(range.dateFrom) } : {}), ...(range.dateTo ? { lte: new Date(range.dateTo) } : {}) } }
      : {};
    const [truck, general] = await this.prisma.$transaction([
      this.prisma.truckExpense.findMany({
        where: { orgId, deletedAt: null, ...within },
        include: { ownTruck: { select: { number: true } } },
      }),
      this.prisma.generalExpense.findMany({ where: { orgId, deletedAt: null, ...within } }),
    ]);
    const rows = [
      ...truck.map((e) => ({
        date: ymd(e.expenseDate),
        category: `Truck · ${e.expenseType}`,
        ref: e.ownTruck?.number ?? '',
        amountPaise: e.amountPaise,
      })),
      ...general.map((e) => ({
        date: ymd(e.expenseDate),
        category: e.category,
        ref: e.description ?? '',
        amountPaise: e.amountPaise,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    const totalPaise = rows.reduce((s, r) => s + r.amountPaise, 0);
    return { rows, totalPaise };
  }

  /** GST report: per delivered GST order, with CGST/SGST/IGST split. */
  async gstReport(orgId: string, range: DateRange) {
    const { settings, state } = await this.orgSettings(orgId);
    const orders = await this.prisma.order.findMany({
      where: {
        orgId,
        deletedAt: null,
        isGst: true,
        status: 'DELIVERED',
        ...(range.dateFrom || range.dateTo
          ? { actualDeliveryAt: { ...(range.dateFrom ? { gte: new Date(range.dateFrom) } : {}), ...(range.dateTo ? { lte: new Date(range.dateTo) } : {}) } }
          : {}),
      },
      include: {
        customer: { select: { name: true, gstin: true } },
        customerAddress: { select: { state: true } },
        stockItems: true,
      },
    });

    const rows = orders.map((o) => {
      const interState =
        Boolean(state) &&
        Boolean(o.customerAddress?.state) &&
        state!.trim().toLowerCase() !== o.customerAddress!.state!.trim().toLowerCase();
      const summary = computeOrderSummary(o, settings, interState);
      return {
        orderNumber: o.orderNumber,
        date: o.actualDeliveryAt ? ymd(o.actualDeliveryAt) : ymd(o.orderDate),
        customer: o.customer?.name ?? '—',
        gstin: o.customer?.gstin ?? '',
        taxablePaise: summary.taxableValuePaise,
        cgstPaise: summary.cgstPaise,
        sgstPaise: summary.sgstPaise,
        igstPaise: summary.igstPaise,
        totalTaxPaise: summary.totalTaxPaise,
      };
    });

    const totals = rows.reduce(
      (t, r) => ({
        taxablePaise: t.taxablePaise + r.taxablePaise,
        cgstPaise: t.cgstPaise + r.cgstPaise,
        sgstPaise: t.sgstPaise + r.sgstPaise,
        igstPaise: t.igstPaise + r.igstPaise,
        totalTaxPaise: t.totalTaxPaise + r.totalTaxPaise,
      }),
      { taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0, totalTaxPaise: 0 },
    );
    return { rows, totals };
  }

  /** Current stock position + batch list. */
  async stockReport(orgId: string) {
    const batches = await this.prisma.stockBatch.findMany({
      where: { orgId, deletedAt: null },
      include: { factory: { select: { name: true } } },
      orderBy: { purchaseDate: 'desc' },
    });
    return batches.map((b) => ({
      date: ymd(b.purchaseDate),
      factory: b.factory?.name ?? '—',
      brickClass: b.brickClass,
      purchased: b.qtyPurchased,
      sold: b.qtySold,
      reserved: b.qtyReserved,
      available: b.qtyPurchased - b.qtySold - b.qtyReserved,
      ratePaise: b.purchasePricePerBrickPaise,
    }));
  }

  /**
   * Full per-customer statement: every order (with truck, invoice, amount paid
   * against it, balance), every payment (allocated + advances), and totals with
   * the journal-authoritative net pending.
   */
  async customerStatement(orgId: string, customerId: string, range: DateRange) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, orgId, deletedAt: null },
      select: { id: true, name: true, phone: true, gstin: true, creditLimitPaise: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const { settings, state } = await this.orgSettings(orgId);

    const orderDateFilter =
      range.dateFrom || range.dateTo
        ? { orderDate: { ...(range.dateFrom ? { gte: new Date(range.dateFrom) } : {}), ...(range.dateTo ? { lte: new Date(range.dateTo) } : {}) } }
        : {};
    const payDateFilter =
      range.dateFrom || range.dateTo
        ? { paymentDate: { ...(range.dateFrom ? { gte: new Date(range.dateFrom) } : {}), ...(range.dateTo ? { lte: new Date(range.dateTo) } : {}) } }
        : {};

    const [orders, payments] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { orgId, customerId, deletedAt: null, ...orderDateFilter },
        orderBy: { orderDate: 'asc' },
        include: {
          customerAddress: { select: { state: true } },
          ownTruck: { select: { number: true } },
          hiredTruck: { select: { number: true } },
          driver: { select: { name: true } },
          stockItems: true,
        },
      }),
      this.prisma.customerPayment.findMany({
        where: { orgId, customerId, deletedAt: null, ...payDateFilter },
        orderBy: { paymentDate: 'asc' },
        include: { order: { select: { orderNumber: true } } },
      }),
    ]);

    // Payments allocated to each order.
    const allocatedByOrder = new Map<string, number>();
    for (const p of payments) {
      if (p.orderId) allocatedByOrder.set(p.orderId, (allocatedByOrder.get(p.orderId) ?? 0) + p.amountPaise);
    }

    let billedDeliveredPaise = 0;
    const orderRows = orders.map((o) => {
      const interState =
        Boolean(state) &&
        Boolean(o.customerAddress?.state) &&
        state!.trim().toLowerCase() !== o.customerAddress!.state!.trim().toLowerCase();
      const summary = computeOrderSummary(o, settings, interState);
      const paidPaise = allocatedByOrder.get(o.id) ?? 0;
      if (o.status === 'DELIVERED') billedDeliveredPaise += summary.invoiceTotalPaise;
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        orderDate: ymd(o.orderDate),
        deliveryDate: o.actualDeliveryAt ? ymd(o.actualDeliveryAt) : null,
        status: o.status,
        orderType: o.orderType,
        brickClass: o.brickClass,
        qtyOrdered: o.qtyOrdered,
        qtyDelivered: o.qtyDelivered,
        truckType: o.truckType,
        truckNumber: o.ownTruck?.number ?? o.hiredTruck?.number ?? null,
        driverName: o.driver?.name ?? null,
        invoicePaise: summary.invoiceTotalPaise,
        paidPaise,
        balancePaise: summary.invoiceTotalPaise - paidPaise,
      };
    });

    const paymentRows = payments.map((p) => ({
      id: p.id,
      date: ymd(p.paymentDate),
      mode: p.paymentMode,
      type: p.paymentType,
      amountPaise: p.amountPaise,
      orderNumber: p.order?.orderNumber ?? null,
      remarks: p.remarks ?? null,
    }));

    const totalPaidPaise = payments.reduce((s, p) => s + p.amountPaise, 0);
    const advancePaise = payments.filter((p) => !p.orderId).reduce((s, p) => s + p.amountPaise, 0);

    // Journal-authoritative net pending (receivable − advance) for this customer.
    const journal = await this.prisma.journalEntry.findMany({
      where: {
        orgId,
        customerId,
        OR: [
          { debitAccount: LedgerAccount.CUSTOMER_RECEIVABLE },
          { creditAccount: LedgerAccount.CUSTOMER_RECEIVABLE },
          { debitAccount: LedgerAccount.ADVANCE_FROM_CUSTOMER },
          { creditAccount: LedgerAccount.ADVANCE_FROM_CUSTOMER },
        ],
      },
      select: { amountPaise: true, debitAccount: true, creditAccount: true },
    });
    let netPendingPaise = 0;
    for (const e of journal) {
      if (e.debitAccount === LedgerAccount.CUSTOMER_RECEIVABLE) netPendingPaise += e.amountPaise;
      if (e.creditAccount === LedgerAccount.CUSTOMER_RECEIVABLE) netPendingPaise -= e.amountPaise;
      if (e.creditAccount === LedgerAccount.ADVANCE_FROM_CUSTOMER) netPendingPaise -= e.amountPaise;
      if (e.debitAccount === LedgerAccount.ADVANCE_FROM_CUSTOMER) netPendingPaise += e.amountPaise;
    }

    return {
      customer,
      orders: orderRows,
      payments: paymentRows,
      totals: {
        billedDeliveredPaise,
        totalPaidPaise,
        advancePaise,
        netPendingPaise,
      },
    };
  }
}
