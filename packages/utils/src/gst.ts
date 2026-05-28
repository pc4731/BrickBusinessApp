// GST splitting. Rate is basis points (1200 = 12%). Intra-state splits into
// equal CGST + SGST; inter-state is a single IGST. Rounding is applied once on
// the total tax, then CGST/SGST are derived so cgst + sgst === totalTax exactly.

export interface GstSplit {
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
}

export function computeGst(
  taxableValuePaise: number,
  rateBasisPoints: number,
  interState: boolean,
): GstSplit {
  if (rateBasisPoints <= 0 || taxableValuePaise <= 0) {
    return { cgstPaise: 0, sgstPaise: 0, igstPaise: 0, totalTaxPaise: 0 };
  }
  const totalTaxPaise = Math.round((taxableValuePaise * rateBasisPoints) / 10000);
  if (interState) {
    return { cgstPaise: 0, sgstPaise: 0, igstPaise: totalTaxPaise, totalTaxPaise };
  }
  // Split so halves always sum back to the rounded total.
  const cgstPaise = Math.floor(totalTaxPaise / 2);
  const sgstPaise = totalTaxPaise - cgstPaise;
  return { cgstPaise, sgstPaise, igstPaise: 0, totalTaxPaise };
}
