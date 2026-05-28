// All money is integer paise. These helpers are the ONLY sanctioned way to
// convert to/from rupees so rounding stays consistent across the stack.

/** Rupees (may be fractional) → integer paise. ₹85.50 → 8550. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Integer paise → rupees as a number. 8550 → 85.5. */
export function fromPaise(paise: number): number {
  return paise / 100;
}

/** Brick rate quoted per 1000 → paise per single brick. ₹8500/1000 → 850. */
export function ratePerThousandToPaisePerBrick(rupeesPerThousand: number): number {
  return Math.round((rupeesPerThousand / 1000) * 100);
}

/** Paise per single brick → rupees per 1000 (for display). 850 → 8500. */
export function paisePerBrickToRatePerThousand(paisePerBrick: number): number {
  return (paisePerBrick / 100) * 1000;
}

/** quantity (brick count) × rate (paise/brick) → total paise. */
export function lineTotalPaise(qtyBricks: number, ratePaisePerBrick: number): number {
  return Math.round(qtyBricks * ratePaisePerBrick);
}

/** Indian-format currency string. 8550 → "₹85.50", 12345678 → "₹1,23,456.78". */
export function formatINR(paise: number): string {
  const negative = paise < 0;
  const rupees = Math.abs(paise) / 100;
  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${negative ? '-' : ''}₹${formatted}`;
}

/** Display brick count as thousands. 5000 → "5", 5500 → "5.5". */
export function bricksToThousands(qtyBricks: number): number {
  return qtyBricks / 1000;
}
