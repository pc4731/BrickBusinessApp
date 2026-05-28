// ════════════════════════════════════════════════════════════════════════
//  Shared types — usable by both the NestJS API and the Next.js client.
//  Enums mirror the Prisma schema (DB is source of truth) but are declared as
//  plain TS unions here so the web bundle never imports @prisma/client.
// ════════════════════════════════════════════════════════════════════════

export const UserRoles = ['OWNER', 'MANAGER', 'ACCOUNTANT'] as const;
export type UserRole = (typeof UserRoles)[number];

export const BrickClasses = ['FIRST', 'SECOND', 'THIRD'] as const;
export type BrickClass = (typeof BrickClasses)[number];

export const OrderTypes = ['DIRECT', 'STOCK'] as const;
export type OrderType = (typeof OrderTypes)[number];

export const OrderStatuses = ['DRAFT', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as const;
export type OrderStatus = (typeof OrderStatuses)[number];

export const TruckTypes = ['OWN', 'HIRED'] as const;
export type TruckType = (typeof TruckTypes)[number];

export const PaymentModes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'] as const;
export type PaymentMode = (typeof PaymentModes)[number];

export const PaymentTypes = ['ADVANCE', 'PARTIAL', 'FULL'] as const;
export type PaymentType = (typeof PaymentTypes)[number];

export const Languages = ['EN', 'HI', 'HINGLISH'] as const;
export type Language = (typeof Languages)[number];

export const TruckExpenseTypes = [
  'FUEL',
  'MAINTENANCE',
  'CHALLAN',
  'SERVICE',
  'INSURANCE',
  'PERMIT',
  'SALARY',
  'OTHER',
] as const;
export type TruckExpenseType = (typeof TruckExpenseTypes)[number];

// Allowed order status transitions (enforced server-side in Phase 2).
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

// ── Org settings (stored in Organization.settings JSON) ──
export type BrickLossPolicy = 'SELLER_BEARS' | 'BUYER_BEARS' | 'SPLIT';

export type OwnTruckCostModel =
  | { type: 'PER_TRIP'; amountPaise: number }
  | { type: 'PER_BRICK'; paisePerBrick: number }
  | { type: 'NONE' };

export interface OrgSettings {
  gstEnabled: boolean;
  defaultGstRate: number; // basis points, 1200 = 12%
  lowStockThresholdBricks: number;
  brickLossPolicy: BrickLossPolicy;
  ownTruckCostModel: OwnTruckCostModel;
  defaultLanguage: Language;
  orderNumberPrefix: string;
}

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  gstEnabled: false,
  defaultGstRate: 1200,
  lowStockThresholdBricks: 5000,
  brickLossPolicy: 'SELLER_BEARS',
  ownTruckCostModel: { type: 'NONE' },
  defaultLanguage: 'EN',
  orderNumberPrefix: 'ORD',
};

// ── Auth DTO shapes ──
export interface JwtPayload {
  sub: string; // userId
  orgId: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: UserRole;
  language: Language;
}

export interface ApiErrorShape {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// ── Pagination ──
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
