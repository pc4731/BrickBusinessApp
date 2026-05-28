import type { TruckType } from '@brick/types';
import { lineTotalPaise } from './money';
import { computeGst } from './gst';

// ── Order financials ──────────────────────────────────────────────────────
// Single source of truth for order money math. Runs identically client-side
// (offline order entry preview) and server-side (authoritative persistence).
//
// Transport handling (per spec):
//   OWN truck   → cost merged into business costing; reduces net profit.
//   HIRED truck → charges kept as a SEPARATE cost line; still reduce net profit
//                 unless billed onward to the customer (transportBilledToCustomer).
//
// "qtyBricks" should be the DELIVERED quantity once a delivery is recorded,
// else the ordered quantity for a preview/estimate.

export interface OrderFinancialsInput {
  qtyBricks: number;
  purchasePricePerBrickPaise: number | null; // null for stock orders (use COGS from batches)
  sellingPricePerBrickPaise: number;
  truckType: TruckType;
  /** Hired truck trip charges (paise). 0 for own trucks. */
  hiredTruckChargesPaise?: number;
  /** Own truck cost derived from org cost model (paise). 0 for hired. */
  ownTruckCostPaise?: number;
  /** If true, transport is recovered from the customer (added to invoice, not a profit drag). */
  transportBilledToCustomer?: boolean;
  /** Cost of goods for stock orders, summed from selected batches (paise). */
  stockCogsPaise?: number;
  gst?: { enabled: boolean; rateBasisPoints: number; interState: boolean };
}

export interface OrderFinancials {
  totalPurchasePaise: number; // COGS
  taxableValuePaise: number; // pre-tax selling value
  transportCostPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  invoiceTotalPaise: number; // what the customer owes (incl. tax + billed transport)
  grossProfitPaise: number; // selling - purchase
  netProfitPaise: number; // gross - transport (when business bears it)
  marginPct: number; // netProfit / taxableValue × 100, rounded to 2 dp
}

export function computeOrderFinancials(input: OrderFinancialsInput): OrderFinancials {
  const {
    qtyBricks,
    purchasePricePerBrickPaise,
    sellingPricePerBrickPaise,
    truckType,
    hiredTruckChargesPaise = 0,
    ownTruckCostPaise = 0,
    transportBilledToCustomer = false,
    stockCogsPaise,
    gst,
  } = input;

  const totalPurchasePaise =
    stockCogsPaise ??
    (purchasePricePerBrickPaise != null
      ? lineTotalPaise(qtyBricks, purchasePricePerBrickPaise)
      : 0);

  const taxableValuePaise = lineTotalPaise(qtyBricks, sellingPricePerBrickPaise);
  const transportCostPaise = truckType === 'HIRED' ? hiredTruckChargesPaise : ownTruckCostPaise;

  const { cgstPaise, sgstPaise, igstPaise, totalTaxPaise } = gst?.enabled
    ? computeGst(taxableValuePaise, gst.rateBasisPoints, gst.interState)
    : { cgstPaise: 0, sgstPaise: 0, igstPaise: 0, totalTaxPaise: 0 };

  const billedTransport = transportBilledToCustomer ? transportCostPaise : 0;
  const invoiceTotalPaise = taxableValuePaise + totalTaxPaise + billedTransport;

  const grossProfitPaise = taxableValuePaise - totalPurchasePaise;
  // Transport reduces profit only when the business bears it.
  const transportDrag = transportBilledToCustomer ? 0 : transportCostPaise;
  const netProfitPaise = grossProfitPaise - transportDrag;

  const marginPct =
    taxableValuePaise > 0 ? Math.round((netProfitPaise / taxableValuePaise) * 10000) / 100 : 0;

  return {
    totalPurchasePaise,
    taxableValuePaise,
    transportCostPaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalTaxPaise,
    invoiceTotalPaise,
    grossProfitPaise,
    netProfitPaise,
    marginPct,
  };
}

// ── Dues / balances ─────────────────────────────────────────────────────────

/** Customer pending = what they owe (invoice total) minus what they've paid. */
export function customerPendingPaise(invoiceTotalPaise: number, totalPaidPaise: number): number {
  return invoiceTotalPaise - totalPaidPaise;
}

/** Factory payable = what we owe (purchase total) minus what we've paid. */
export function factoryPayablePaise(purchaseTotalPaise: number, totalPaidPaise: number): number {
  return purchaseTotalPaise - totalPaidPaise;
}

/** Days a due has been outstanding, for aging buckets. */
export function daysOverdue(dueDate: Date, asOf: Date = new Date()): number {
  const ms = asOf.getTime() - dueDate.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export type AgingBucket = '0-30' | '31-60' | '61-90' | '90+';

export function agingBucket(days: number): AgingBucket {
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}
