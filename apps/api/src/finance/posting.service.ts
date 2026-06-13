import { Injectable } from '@nestjs/common';
import { Prisma, LedgerAccount, JournalRefType, PaymentMode } from '@brick/db';
import type { OrderFinancials } from '@brick/utils';

type Tx = Prisma.TransactionClient;

interface RowInput {
  orgId: string;
  entryDate: Date;
  description: string;
  refType: JournalRefType;
  refId?: string;
  debitAccount: LedgerAccount;
  creditAccount: LedgerAccount;
  amountPaise: number;
  customerId?: string;
  factoryId?: string;
  hiredTruckId?: string;
  ownTruckId?: string;
  truckRentalId?: string;
  createdById?: string;
}

/** Bank-side account for a payment mode (cash drawer vs bank account). */
function cashAccount(mode: PaymentMode): LedgerAccount {
  return mode === 'CASH' ? LedgerAccount.CASH : LedgerAccount.BANK;
}

/**
 * Writes balanced journal rows for every financial event. Each row is a single
 * debit/credit of equal amount; multi-leg events emit several rows sharing
 * refType/refId. Rows are immutable — corrections are posted as reversals.
 */
@Injectable()
export class PostingService {
  private row(tx: Tx, e: RowInput) {
    if (e.amountPaise <= 0) return Promise.resolve(null); // skip empty legs
    return tx.journalEntry.create({
      data: {
        orgId: e.orgId,
        entryDate: e.entryDate,
        description: e.description,
        refType: e.refType,
        refId: e.refId,
        debitAccount: e.debitAccount,
        creditAccount: e.creditAccount,
        amountPaise: e.amountPaise,
        customerId: e.customerId,
        factoryId: e.factoryId,
        hiredTruckId: e.hiredTruckId,
        ownTruckId: e.ownTruckId,
        truckRentalId: e.truckRentalId,
        createdById: e.createdById,
      },
    });
  }

  /** Revenue + GST + COGS (+ hired transport) recognised when an order is delivered. */
  async postOrderDelivered(
    tx: Tx,
    args: {
      orgId: string;
      orderId: string;
      orderNumber: string;
      orderType: 'DIRECT' | 'STOCK';
      truckType: 'OWN' | 'HIRED';
      customerId: string;
      factoryId: string | null;
      hiredTruckId: string | null;
      entryDate: Date;
      summary: OrderFinancials;
      createdById?: string;
    },
  ) {
    const base = {
      orgId: args.orgId,
      entryDate: args.entryDate,
      refType: JournalRefType.ORDER,
      refId: args.orderId,
      createdById: args.createdById,
    };
    const desc = `Order ${args.orderNumber}`;

    // Sale (taxable value) → receivable.
    await this.row(tx, {
      ...base,
      description: `${desc} — sale`,
      debitAccount: LedgerAccount.CUSTOMER_RECEIVABLE,
      creditAccount: LedgerAccount.REVENUE,
      amountPaise: args.summary.taxableValuePaise,
      customerId: args.customerId,
    });

    // Output GST → receivable.
    await this.row(tx, {
      ...base,
      description: `${desc} — GST`,
      debitAccount: LedgerAccount.CUSTOMER_RECEIVABLE,
      creditAccount: LedgerAccount.GST_OUTPUT_PAYABLE,
      amountPaise: args.summary.totalTaxPaise,
      customerId: args.customerId,
    });

    // COGS: direct creates a factory payable; stock relieves inventory.
    if (args.orderType === 'DIRECT') {
      await this.row(tx, {
        ...base,
        description: `${desc} — purchase`,
        debitAccount: LedgerAccount.COGS,
        creditAccount: LedgerAccount.FACTORY_PAYABLE,
        amountPaise: args.summary.totalPurchasePaise,
        factoryId: args.factoryId ?? undefined,
      });
    } else {
      await this.row(tx, {
        ...base,
        description: `${desc} — COGS from stock`,
        debitAccount: LedgerAccount.COGS,
        creditAccount: LedgerAccount.INVENTORY,
        amountPaise: args.summary.totalPurchasePaise,
      });
    }

    // Hired transport is a real payable; own-truck cost is managerial only.
    if (args.truckType === 'HIRED') {
      await this.row(tx, {
        ...base,
        description: `${desc} — hired transport`,
        debitAccount: LedgerAccount.TRUCK_EXPENSE,
        creditAccount: LedgerAccount.HIRED_TRUCK_PAYABLE,
        amountPaise: args.summary.transportCostPaise,
        hiredTruckId: args.hiredTruckId ?? undefined,
      });
    }
  }

  /** Stock bought into the yard: capitalise to inventory, owe the factory. */
  postStockPurchase(
    tx: Tx,
    args: {
      orgId: string;
      batchId: string;
      factoryId: string;
      entryDate: Date;
      amountPaise: number;
      createdById?: string;
    },
  ) {
    return this.row(tx, {
      orgId: args.orgId,
      entryDate: args.entryDate,
      description: 'Stock purchase',
      refType: JournalRefType.STOCK_PURCHASE,
      refId: args.batchId,
      debitAccount: LedgerAccount.INVENTORY,
      creditAccount: LedgerAccount.FACTORY_PAYABLE,
      amountPaise: args.amountPaise,
      factoryId: args.factoryId,
      createdById: args.createdById,
    });
  }

  postCustomerPayment(
    tx: Tx,
    args: {
      orgId: string;
      paymentId: string;
      customerId: string;
      allocatedToOrder: boolean;
      mode: PaymentMode;
      amountPaise: number;
      entryDate: Date;
      createdById?: string;
    },
  ) {
    return this.row(tx, {
      orgId: args.orgId,
      entryDate: args.entryDate,
      description: args.allocatedToOrder ? 'Customer payment' : 'Customer advance',
      refType: JournalRefType.CUSTOMER_PAYMENT,
      refId: args.paymentId,
      debitAccount: cashAccount(args.mode),
      creditAccount: args.allocatedToOrder
        ? LedgerAccount.CUSTOMER_RECEIVABLE
        : LedgerAccount.ADVANCE_FROM_CUSTOMER,
      amountPaise: args.amountPaise,
      customerId: args.customerId,
      createdById: args.createdById,
    });
  }

  postFactoryPayment(
    tx: Tx,
    args: {
      orgId: string;
      paymentId: string;
      factoryId: string;
      allocatedToOrder: boolean;
      mode: PaymentMode;
      amountPaise: number;
      entryDate: Date;
      createdById?: string;
    },
  ) {
    return this.row(tx, {
      orgId: args.orgId,
      entryDate: args.entryDate,
      description: args.allocatedToOrder ? 'Factory payment' : 'Factory advance',
      refType: JournalRefType.FACTORY_PAYMENT,
      refId: args.paymentId,
      debitAccount: args.allocatedToOrder
        ? LedgerAccount.FACTORY_PAYABLE
        : LedgerAccount.ADVANCE_TO_FACTORY,
      creditAccount: cashAccount(args.mode),
      amountPaise: args.amountPaise,
      factoryId: args.factoryId,
      createdById: args.createdById,
    });
  }

  postTruckPayment(
    tx: Tx,
    args: {
      orgId: string;
      paymentId: string;
      hiredTruckId: string;
      mode: PaymentMode;
      amountPaise: number;
      entryDate: Date;
      createdById?: string;
    },
  ) {
    return this.row(tx, {
      orgId: args.orgId,
      entryDate: args.entryDate,
      description: 'Hired truck payment',
      refType: JournalRefType.TRUCK_PAYMENT,
      refId: args.paymentId,
      debitAccount: LedgerAccount.HIRED_TRUCK_PAYABLE,
      creditAccount: cashAccount(args.mode),
      amountPaise: args.amountPaise,
      hiredTruckId: args.hiredTruckId,
      createdById: args.createdById,
    });
  }

  /**
   * Own truck lent out on rent: recognise the full agreed rent as income now,
   * with a receivable until it's collected. No brick/GST math — rent only.
   */
  postTruckRental(
    tx: Tx,
    args: {
      orgId: string;
      rentalId: string;
      ownTruckId: string;
      amountPaise: number;
      entryDate: Date;
      description: string;
      createdById?: string;
    },
  ) {
    return this.row(tx, {
      orgId: args.orgId,
      entryDate: args.entryDate,
      description: args.description,
      refType: JournalRefType.TRUCK_RENTAL,
      refId: args.rentalId,
      debitAccount: LedgerAccount.RENTAL_RECEIVABLE,
      creditAccount: LedgerAccount.RENTAL_INCOME,
      amountPaise: args.amountPaise,
      ownTruckId: args.ownTruckId,
      truckRentalId: args.rentalId,
      createdById: args.createdById,
    });
  }

  /** Rent collected against a lending agreement → clears the rental receivable. */
  postTruckRentalPayment(
    tx: Tx,
    args: {
      orgId: string;
      paymentId: string;
      rentalId: string;
      ownTruckId: string;
      mode: PaymentMode;
      amountPaise: number;
      entryDate: Date;
      createdById?: string;
    },
  ) {
    return this.row(tx, {
      orgId: args.orgId,
      entryDate: args.entryDate,
      description: 'Truck rent received',
      refType: JournalRefType.TRUCK_RENTAL_PAYMENT,
      refId: args.paymentId,
      debitAccount: cashAccount(args.mode),
      creditAccount: LedgerAccount.RENTAL_RECEIVABLE,
      amountPaise: args.amountPaise,
      ownTruckId: args.ownTruckId,
      truckRentalId: args.rentalId,
      createdById: args.createdById,
    });
  }

  postTruckExpense(
    tx: Tx,
    args: {
      orgId: string;
      expenseId: string;
      ownTruckId: string;
      amountPaise: number;
      entryDate: Date;
      description: string;
      createdById?: string;
    },
  ) {
    return this.row(tx, {
      orgId: args.orgId,
      entryDate: args.entryDate,
      description: args.description,
      refType: JournalRefType.TRUCK_EXPENSE,
      refId: args.expenseId,
      debitAccount: LedgerAccount.TRUCK_EXPENSE,
      creditAccount: LedgerAccount.CASH,
      amountPaise: args.amountPaise,
      ownTruckId: args.ownTruckId,
      createdById: args.createdById,
    });
  }

  postGeneralExpense(
    tx: Tx,
    args: {
      orgId: string;
      expenseId: string;
      amountPaise: number;
      entryDate: Date;
      description: string;
      createdById?: string;
    },
  ) {
    return this.row(tx, {
      orgId: args.orgId,
      entryDate: args.entryDate,
      description: args.description,
      refType: JournalRefType.GENERAL_EXPENSE,
      refId: args.expenseId,
      debitAccount: LedgerAccount.GENERAL_EXPENSE,
      creditAccount: LedgerAccount.CASH,
      amountPaise: args.amountPaise,
      createdById: args.createdById,
    });
  }

  /** Reverse a posted event by swapping debit/credit on each of its rows. */
  async reverse(
    tx: Tx,
    args: {
      orgId: string;
      refType: JournalRefType;
      refId: string;
      entryDate: Date;
      reason: string;
      createdById?: string;
    },
  ) {
    const original = await tx.journalEntry.findMany({
      where: { orgId: args.orgId, refType: args.refType, refId: args.refId },
    });
    for (const e of original) {
      await this.row(tx, {
        orgId: args.orgId,
        entryDate: args.entryDate,
        description: `Reversal: ${args.reason}`,
        refType: JournalRefType.ADJUSTMENT,
        refId: args.refId,
        debitAccount: e.creditAccount, // swapped
        creditAccount: e.debitAccount,
        amountPaise: e.amountPaise,
        customerId: e.customerId ?? undefined,
        factoryId: e.factoryId ?? undefined,
        hiredTruckId: e.hiredTruckId ?? undefined,
        ownTruckId: e.ownTruckId ?? undefined,
        truckRentalId: e.truckRentalId ?? undefined,
        createdById: args.createdById,
      });
    }
  }
}
