import type { Prisma } from '@brick/db';
import { formatOrderNumber, parseOrderNumber } from '@brick/utils';

type Tx = Prisma.TransactionClient;

/**
 * Allocates the next per-org, per-year order number (ORD-2026-0001).
 * Sequence = (highest existing sequence this year) + 1. Using the max rather
 * than a row count keeps numbering correct across gaps (hard-deleted/imported
 * orders), so retries don't keep regenerating the same colliding number.
 * Concurrent creators may still collide on the same number; the unique
 * (orgId, orderNumber) index rejects the loser, which the caller retries.
 */
export async function nextOrderNumber(
  tx: Tx,
  orgId: string,
  prefix: string,
  year: number,
): Promise<string> {
  const latest = await tx.order.findFirst({
    where: { orgId, orderNumber: { startsWith: `${prefix}-${year}-` } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });
  const lastSeq = latest ? (parseOrderNumber(latest.orderNumber)?.sequence ?? 0) : 0;
  return formatOrderNumber(prefix, year, lastSeq + 1);
}
