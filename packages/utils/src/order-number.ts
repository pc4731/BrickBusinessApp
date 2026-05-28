// Human-readable order numbers for field/verbal use: ORD-2026-0001.
// The numeric sequence is per org + per year (allocated server-side).

export function formatOrderNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

export function parseOrderNumber(
  orderNumber: string,
): { prefix: string; year: number; sequence: number } | null {
  const match = /^([A-Z]+)-(\d{4})-(\d+)$/.exec(orderNumber);
  if (!match) return null;
  return { prefix: match[1]!, year: Number(match[2]), sequence: Number(match[3]) };
}
