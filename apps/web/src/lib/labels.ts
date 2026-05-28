import type { BrickClass } from '@brick/types';
import type { OrderStatus } from './entities';

export const BRICK_LABELS: Record<BrickClass, string> = {
  FIRST: '1st Class',
  SECOND: '2nd Class',
  THIRD: '3rd Class',
};

export const BRICK_SHORT: Record<BrickClass, string> = {
  FIRST: '1st',
  SECOND: '2nd',
  THIRD: '3rd',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

type BadgeVariant = 'default' | 'secondary' | 'success' | 'muted' | 'destructive';

export const ORDER_STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  DRAFT: 'muted',
  CONFIRMED: 'secondary',
  IN_TRANSIT: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
};

/** brick count → "5" or "5.5" thousands label. */
export const thousands = (bricks: number): string => {
  const n = bricks / 1000;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};
