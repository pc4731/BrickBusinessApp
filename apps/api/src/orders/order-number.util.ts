import type { Prisma } from '@brick/db';
import { formatOrderNumber } from '@brick/utils';

type Tx = Prisma.TransactionClient;

/**
 * Allocates the next per-org, per-year order number (ORD-2026-0001).
 * Sequence = (count of this year's orders) + 1. Concurrent creators may collide
 * on the same number; the unique (orgId, orderNumber) index rejects the loser,
 * which the caller retries.
 */
export async function nextOrderNumber(
  tx: Tx,
  orgId: string,
  prefix: string,
  year: number,
): Promise<string> {
  const count = await tx.order.count({
    where: { orgId, orderNumber: { startsWith: `${prefix}-${year}-` } },
  });
  return formatOrderNumber(prefix, year, count + 1);
}
