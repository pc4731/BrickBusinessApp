import { describe, it, expect } from 'vitest';
import {
  toPaise,
  ratePerThousandToPaisePerBrick,
  paisePerBrickToRatePerThousand,
  formatINR,
  lineTotalPaise,
} from './money';
import { computeGst } from './gst';
import { computeOrderFinancials, customerPendingPaise, agingBucket } from './calculations';
import { formatOrderNumber, parseOrderNumber } from './order-number';

describe('money', () => {
  it('converts rupees to paise without float drift', () => {
    expect(toPaise(85.5)).toBe(8550);
    expect(toPaise(8500)).toBe(850000);
  });

  it('converts brick rate per 1000 to paise per brick', () => {
    expect(ratePerThousandToPaisePerBrick(8500)).toBe(850);
    expect(paisePerBrickToRatePerThousand(850)).toBe(8500);
  });

  it('computes line totals on integer paise', () => {
    // 9375 bricks @ ₹8500/1000 = 850 paise/brick = 7,968,750 paise = ₹79,687.50
    expect(lineTotalPaise(9375, 850)).toBe(7968750);
  });

  it('formats Indian currency', () => {
    expect(formatINR(7968750)).toBe('₹79,687.50');
    expect(formatINR(-5000)).toBe('-₹50.00');
  });
});

describe('gst', () => {
  it('splits intra-state into equal cgst+sgst summing to total', () => {
    const g = computeGst(100000, 1200, false); // 12% of ₹1000 = ₹120
    expect(g.totalTaxPaise).toBe(12000);
    expect(g.cgstPaise + g.sgstPaise).toBe(12000);
    expect(g.igstPaise).toBe(0);
  });

  it('uses igst for inter-state', () => {
    const g = computeGst(100000, 1800, true);
    expect(g.igstPaise).toBe(18000);
    expect(g.cgstPaise).toBe(0);
  });

  it('handles odd totals so halves still sum back', () => {
    const g = computeGst(100001, 1200, false); // odd taxable value
    expect(g.cgstPaise + g.sgstPaise).toBe(g.totalTaxPaise);
  });
});

describe('order financials', () => {
  it('computes a direct order with own truck (transport merged)', () => {
    const f = computeOrderFinancials({
      qtyBricks: 5000,
      purchasePricePerBrickPaise: 520, // ₹5200/1000
      sellingPricePerBrickPaise: 850, // ₹8500/1000
      truckType: 'OWN',
      ownTruckCostPaise: toPaise(1500),
    });
    expect(f.totalPurchasePaise).toBe(2600000); // ₹26,000
    expect(f.taxableValuePaise).toBe(4250000); // ₹42,500
    expect(f.grossProfitPaise).toBe(1650000); // ₹16,500
    expect(f.netProfitPaise).toBe(1500000); // ₹16,500 - ₹1,500 transport
    expect(f.invoiceTotalPaise).toBe(4250000); // no GST, transport not billed
  });

  it('keeps hired truck charges separate and as a profit drag by default', () => {
    const f = computeOrderFinancials({
      qtyBricks: 5000,
      purchasePricePerBrickPaise: 520,
      sellingPricePerBrickPaise: 850,
      truckType: 'HIRED',
      hiredTruckChargesPaise: toPaise(3000),
    });
    expect(f.transportCostPaise).toBe(300000);
    expect(f.netProfitPaise).toBe(1650000 - 300000);
  });

  it('does not drag profit when transport is billed to the customer', () => {
    const f = computeOrderFinancials({
      qtyBricks: 5000,
      purchasePricePerBrickPaise: 520,
      sellingPricePerBrickPaise: 850,
      truckType: 'HIRED',
      hiredTruckChargesPaise: toPaise(3000),
      transportBilledToCustomer: true,
    });
    expect(f.netProfitPaise).toBe(1650000); // gross == net
    expect(f.invoiceTotalPaise).toBe(4250000 + 300000); // transport added to invoice
  });

  it('applies GST to invoice total', () => {
    const f = computeOrderFinancials({
      qtyBricks: 5000,
      purchasePricePerBrickPaise: 520,
      sellingPricePerBrickPaise: 850,
      truckType: 'OWN',
      gst: { enabled: true, rateBasisPoints: 1200, interState: false },
    });
    expect(f.totalTaxPaise).toBe(510000); // 12% of ₹42,500 = ₹5,100
    expect(f.invoiceTotalPaise).toBe(4250000 + 510000);
  });
});

describe('dues', () => {
  it('computes customer pending', () => {
    expect(customerPendingPaise(4250000, 2000000)).toBe(2250000);
  });

  it('buckets aging', () => {
    expect(agingBucket(15)).toBe('0-30');
    expect(agingBucket(45)).toBe('31-60');
    expect(agingBucket(120)).toBe('90+');
  });
});

describe('order number', () => {
  it('formats and round-trips', () => {
    const n = formatOrderNumber('ORD', 2026, 1);
    expect(n).toBe('ORD-2026-0001');
    expect(parseOrderNumber(n)).toEqual({ prefix: 'ORD', year: 2026, sequence: 1 });
  });
});
