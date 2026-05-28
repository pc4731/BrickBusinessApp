import { Injectable } from '@nestjs/common';
import { Prisma, LedgerAccount } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';

interface DateRange {
  dateFrom?: string;
  dateTo?: string;
}

type Sums = Map<LedgerAccount, number>;

@Injectable()
export class LedgerService {
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

  /** Debit & credit totals per account for the given filter. */
  private async sums(where: Prisma.JournalEntryWhereInput): Promise<{ debit: Sums; credit: Sums }> {
    const [debits, credits] = await this.prisma.$transaction([
      this.prisma.journalEntry.groupBy({
        by: ['debitAccount'],
        where,
        _sum: { amountPaise: true },
        orderBy: { debitAccount: 'asc' },
      }),
      this.prisma.journalEntry.groupBy({
        by: ['creditAccount'],
        where,
        _sum: { amountPaise: true },
        orderBy: { creditAccount: 'asc' },
      }),
    ]);
    const debit: Sums = new Map();
    const credit: Sums = new Map();
    for (const d of debits) debit.set(d.debitAccount, d._sum?.amountPaise ?? 0);
    for (const c of credits) credit.set(c.creditAccount, c._sum?.amountPaise ?? 0);
    return { debit, credit };
  }

  private debitNormal(s: { debit: Sums; credit: Sums }, a: LedgerAccount): number {
    return (s.debit.get(a) ?? 0) - (s.credit.get(a) ?? 0);
  }
  private creditNormal(s: { debit: Sums; credit: Sums }, a: LedgerAccount): number {
    return (s.credit.get(a) ?? 0) - (s.debit.get(a) ?? 0);
  }

  /** Finance dashboard: P&L over the range, balances cumulative as-of dateTo. */
  async dashboard(orgId: string, range: DateRange) {
    const pl = await this.sums({ orgId, ...this.dateWhere(range) });
    // Balances are cumulative up to dateTo (or all-time).
    const bal = await this.sums({ orgId, ...this.dateWhere({ dateTo: range.dateTo }) });

    const revenue = this.creditNormal(pl, LedgerAccount.REVENUE);
    const cogs = this.debitNormal(pl, LedgerAccount.COGS);
    const truckExpense = this.debitNormal(pl, LedgerAccount.TRUCK_EXPENSE);
    const generalExpense = this.debitNormal(pl, LedgerAccount.GENERAL_EXPENSE);
    const grossProfit = revenue - cogs;
    const totalExpenses = truckExpense + generalExpense;
    const netProfit = grossProfit - totalExpenses;

    const receivable = this.debitNormal(bal, LedgerAccount.CUSTOMER_RECEIVABLE);
    const advanceFromCustomer = this.creditNormal(bal, LedgerAccount.ADVANCE_FROM_CUSTOMER);
    const payable = this.creditNormal(bal, LedgerAccount.FACTORY_PAYABLE);
    const advanceToFactory = this.debitNormal(bal, LedgerAccount.ADVANCE_TO_FACTORY);
    const hiredTruckPayable = this.creditNormal(bal, LedgerAccount.HIRED_TRUCK_PAYABLE);

    return {
      pl: {
        revenuePaise: revenue,
        cogsPaise: cogs,
        truckExpensePaise: truckExpense,
        generalExpensePaise: generalExpense,
        totalExpensesPaise: totalExpenses,
        grossProfitPaise: grossProfit,
        netProfitPaise: netProfit,
        gstOutputPaise: this.creditNormal(pl, LedgerAccount.GST_OUTPUT_PAYABLE),
      },
      balances: {
        cashPaise: this.debitNormal(bal, LedgerAccount.CASH),
        bankPaise: this.debitNormal(bal, LedgerAccount.BANK),
        inventoryPaise: this.debitNormal(bal, LedgerAccount.INVENTORY),
        receivablePaise: receivable,
        netReceivablePaise: receivable - advanceFromCustomer,
        advanceFromCustomerPaise: advanceFromCustomer,
        payablePaise: payable,
        netPayablePaise: payable - advanceToFactory,
        advanceToFactoryPaise: advanceToFactory,
        hiredTruckPayablePaise: hiredTruckPayable,
      },
    };
  }

  /** Net pending per customer (receivable − advance), only those with a balance. */
  async customerDues(orgId: string) {
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        orgId,
        customerId: { not: null },
        OR: [
          { debitAccount: LedgerAccount.CUSTOMER_RECEIVABLE },
          { creditAccount: LedgerAccount.CUSTOMER_RECEIVABLE },
          { debitAccount: LedgerAccount.ADVANCE_FROM_CUSTOMER },
          { creditAccount: LedgerAccount.ADVANCE_FROM_CUSTOMER },
        ],
      },
      select: {
        customerId: true,
        amountPaise: true,
        debitAccount: true,
        creditAccount: true,
      },
    });

    const byCustomer = new Map<string, number>();
    for (const e of entries) {
      const id = e.customerId!;
      let delta = 0;
      if (e.debitAccount === LedgerAccount.CUSTOMER_RECEIVABLE) delta += e.amountPaise;
      if (e.creditAccount === LedgerAccount.CUSTOMER_RECEIVABLE) delta -= e.amountPaise;
      if (e.creditAccount === LedgerAccount.ADVANCE_FROM_CUSTOMER) delta -= e.amountPaise;
      if (e.debitAccount === LedgerAccount.ADVANCE_FROM_CUSTOMER) delta += e.amountPaise;
      byCustomer.set(id, (byCustomer.get(id) ?? 0) + delta);
    }

    const ids = [...byCustomer.keys()];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, phone: true },
    });
    const nameById = new Map(customers.map((c) => [c.id, c]));

    return [...byCustomer.entries()]
      .map(([customerId, pendingPaise]) => ({
        customerId,
        name: nameById.get(customerId)?.name ?? 'Unknown',
        phone: nameById.get(customerId)?.phone ?? '',
        pendingPaise,
      }))
      .filter((r) => r.pendingPaise !== 0)
      .sort((a, b) => b.pendingPaise - a.pendingPaise);
  }

  /** Net payable per factory (payable − advance). */
  async factoryDues(orgId: string) {
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        orgId,
        factoryId: { not: null },
        OR: [
          { debitAccount: LedgerAccount.FACTORY_PAYABLE },
          { creditAccount: LedgerAccount.FACTORY_PAYABLE },
          { debitAccount: LedgerAccount.ADVANCE_TO_FACTORY },
          { creditAccount: LedgerAccount.ADVANCE_TO_FACTORY },
        ],
      },
      select: { factoryId: true, amountPaise: true, debitAccount: true, creditAccount: true },
    });

    const byFactory = new Map<string, number>();
    for (const e of entries) {
      const id = e.factoryId!;
      let delta = 0;
      if (e.creditAccount === LedgerAccount.FACTORY_PAYABLE) delta += e.amountPaise;
      if (e.debitAccount === LedgerAccount.FACTORY_PAYABLE) delta -= e.amountPaise;
      if (e.debitAccount === LedgerAccount.ADVANCE_TO_FACTORY) delta -= e.amountPaise;
      if (e.creditAccount === LedgerAccount.ADVANCE_TO_FACTORY) delta += e.amountPaise;
      byFactory.set(id, (byFactory.get(id) ?? 0) + delta);
    }

    const ids = [...byFactory.keys()];
    const factories = await this.prisma.factory.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, phone: true },
    });
    const byId = new Map(factories.map((f) => [f.id, f]));

    return [...byFactory.entries()]
      .map(([factoryId, payablePaise]) => ({
        factoryId,
        name: byId.get(factoryId)?.name ?? 'Unknown',
        phone: byId.get(factoryId)?.phone ?? '',
        payablePaise,
      }))
      .filter((r) => r.payablePaise !== 0)
      .sort((a, b) => b.payablePaise - a.payablePaise);
  }

  /** Customer ledger: dated entries with a running net-owed balance. */
  async customerLedger(orgId: string, customerId: string) {
    const entries = await this.prisma.journalEntry.findMany({
      where: { orgId, customerId },
      orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
    });
    let running = 0;
    const rows = entries.map((e) => {
      let debit = 0;
      let credit = 0;
      if (e.debitAccount === LedgerAccount.CUSTOMER_RECEIVABLE) debit = e.amountPaise;
      if (e.creditAccount === LedgerAccount.CUSTOMER_RECEIVABLE) credit = e.amountPaise;
      if (e.creditAccount === LedgerAccount.ADVANCE_FROM_CUSTOMER) credit = e.amountPaise;
      if (e.debitAccount === LedgerAccount.ADVANCE_FROM_CUSTOMER) debit = e.amountPaise;
      running += debit - credit;
      return {
        id: e.id,
        date: e.entryDate,
        description: e.description,
        debitPaise: debit,
        creditPaise: credit,
        balancePaise: running,
      };
    });
    return { rows, closingPaise: running };
  }

  /** Factory ledger: dated entries with a running payable balance. */
  async factoryLedger(orgId: string, factoryId: string) {
    const entries = await this.prisma.journalEntry.findMany({
      where: { orgId, factoryId },
      orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
    });
    let running = 0;
    const rows = entries.map((e) => {
      let purchase = 0;
      let payment = 0;
      if (e.creditAccount === LedgerAccount.FACTORY_PAYABLE) purchase = e.amountPaise;
      if (e.debitAccount === LedgerAccount.FACTORY_PAYABLE) payment = e.amountPaise;
      if (e.debitAccount === LedgerAccount.ADVANCE_TO_FACTORY) payment = e.amountPaise;
      if (e.creditAccount === LedgerAccount.ADVANCE_TO_FACTORY) purchase = e.amountPaise;
      running += purchase - payment;
      return {
        id: e.id,
        date: e.entryDate,
        description: e.description,
        purchasePaise: purchase,
        paymentPaise: payment,
        balancePaise: running,
      };
    });
    return { rows, closingPaise: running };
  }

  /** Cashbook: every CASH/BANK movement with a running combined balance. */
  async cashbook(orgId: string, range: DateRange) {
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        orgId,
        ...this.dateWhere(range),
        OR: [
          { debitAccount: { in: [LedgerAccount.CASH, LedgerAccount.BANK] } },
          { creditAccount: { in: [LedgerAccount.CASH, LedgerAccount.BANK] } },
        ],
      },
      orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
    });
    const isCashSide = (a: LedgerAccount) => a === LedgerAccount.CASH || a === LedgerAccount.BANK;
    let running = 0;
    const rows = entries.map((e) => {
      const inflow = isCashSide(e.debitAccount) ? e.amountPaise : 0;
      const outflow = isCashSide(e.creditAccount) ? e.amountPaise : 0;
      running += inflow - outflow;
      const account = isCashSide(e.debitAccount) ? e.debitAccount : e.creditAccount;
      return {
        id: e.id,
        date: e.entryDate,
        description: e.description,
        account,
        inflowPaise: inflow,
        outflowPaise: outflow,
        balancePaise: running,
      };
    });
    return { rows, closingPaise: running };
  }
}
