import type { BrickClass, Language, OrgSettings, UserRole } from '@brick/types';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  phoneAlt?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  creditLimitPaise: number;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string;
  fullAddress: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  isDefault: boolean;
}

export interface BrickPrice {
  id: string;
  brickClass: BrickClass;
  pricePerBrickPaise: number;
  effectiveFrom: string;
  note?: string | null;
}

export type CustomerDetail = Customer & {
  addresses: CustomerAddress[];
  currentPrices: BrickPrice[];
};

export interface Factory {
  id: string;
  name: string;
  ownerName?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  creditLimitPaise: number;
  creditDays: number;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
}

export type FactoryDetail = Factory & { currentPrices: BrickPrice[] };

export interface OwnTruck {
  id: string;
  number: string;
  model?: string | null;
  capacityBricks?: number | null;
  insuranceExpiry?: string | null;
  permitExpiry?: string | null;
  fitnessExpiry?: string | null;
  isActive: boolean;
  notes?: string | null;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string | null;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  isActive: boolean;
}

export interface HiredTruck {
  id: string;
  number: string;
  ownerName?: string | null;
  ownerPhone?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  isActive: boolean;
}

export interface OrgSettingsResponse {
  id: string;
  name: string;
  legalName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  logoUrl?: string | null;
  settings: OrgSettings;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  language: Language;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface StockBatch {
  id: string;
  factoryId: string;
  factory?: { id: string; name: string };
  brickClass: BrickClass;
  qtyPurchased: number;
  qtySold: number;
  qtyReserved: number;
  qtyAvailable: number;
  purchasePricePerBrickPaise: number;
  purchaseDate: string;
  transportCostPaise: number;
  notes?: string | null;
}

export interface StockSummaryRow {
  brickClass: BrickClass;
  purchased: number;
  sold: number;
  reserved: number;
  available: number;
  lowStock: boolean;
  threshold: number;
}

export interface OrderFinancialsView {
  totalPurchasePaise: number;
  taxableValuePaise: number;
  transportCostPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  invoiceTotalPaise: number;
  grossProfitPaise: number;
  netProfitPaise: number;
  marginPct: number;
}

export type OrderType = 'DIRECT' | 'STOCK';
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type TruckType = 'OWN' | 'HIRED';

export interface OrderStockItem {
  id: string;
  stockBatchId: string;
  qtyTaken: number;
  purchasePricePerBrickPaise: number;
  stockBatch?: { id: string; brickClass: BrickClass; purchaseDate: string };
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  customerId: string;
  customer?: { id: string; name: string; phone: string };
  customerAddressId?: string | null;
  customerAddress?: CustomerAddress | null;
  factoryId?: string | null;
  factory?: { id: string; name: string } | null;
  brickClass: BrickClass;
  qtyOrdered: number;
  qtyDelivered?: number | null;
  qtyDiscrepancy: number;
  purchasePricePerBrickPaise?: number | null;
  sellingPricePerBrickPaise: number;
  truckType: TruckType;
  ownTruck?: { id: string; number: string } | null;
  hiredTruck?: { id: string; number: string; ownerName?: string | null } | null;
  driver?: { id: string; name: string } | null;
  truckChargesPaise: number;
  isGst: boolean;
  gstRate: number;
  orderDate: string;
  deliveryDate?: string | null;
  actualDeliveryAt?: string | null;
  deliveryLocation?: string | null;
  notes?: string | null;
  stockItems: OrderStockItem[];
  summary: OrderFinancialsView;
}

// ── Finance ──
export interface FinanceDashboard {
  pl: {
    revenuePaise: number;
    cogsPaise: number;
    truckExpensePaise: number;
    generalExpensePaise: number;
    totalExpensesPaise: number;
    grossProfitPaise: number;
    netProfitPaise: number;
    gstOutputPaise: number;
  };
  balances: {
    cashPaise: number;
    bankPaise: number;
    inventoryPaise: number;
    receivablePaise: number;
    netReceivablePaise: number;
    advanceFromCustomerPaise: number;
    payablePaise: number;
    netPayablePaise: number;
    advanceToFactoryPaise: number;
    hiredTruckPayablePaise: number;
  };
}

export interface CustomerDueRow {
  customerId: string;
  name: string;
  phone: string;
  pendingPaise: number;
}

export interface FactoryDueRow {
  factoryId: string;
  name: string;
  phone: string;
  payablePaise: number;
}

export interface CustomerLedgerRow {
  id: string;
  date: string;
  description: string;
  debitPaise: number;
  creditPaise: number;
  balancePaise: number;
}

export interface FactoryLedgerRow {
  id: string;
  date: string;
  description: string;
  purchasePaise: number;
  paymentPaise: number;
  balancePaise: number;
}

export interface CashbookRow {
  id: string;
  date: string;
  description: string;
  account: 'CASH' | 'BANK';
  inflowPaise: number;
  outflowPaise: number;
  balancePaise: number;
}

export interface CustomerPaymentRow {
  id: string;
  customerId: string;
  orderId?: string | null;
  order?: { orderNumber: string } | null;
  amountPaise: number;
  paymentMode: string;
  paymentType: string;
  paymentDate: string;
  remarks?: string | null;
}

export interface TruckExpenseRow {
  id: string;
  ownTruckId: string;
  ownTruck?: { number: string };
  expenseType: string;
  amountPaise: number;
  expenseDate: string;
  description?: string | null;
}

export interface GeneralExpenseRow {
  id: string;
  category: string;
  amountPaise: number;
  expenseDate: string;
  description?: string | null;
}

// ── Reports ──
export interface PnlReport {
  revenuePaise: number;
  cogsPaise: number;
  grossProfitPaise: number;
  truckExpensePaise: number;
  generalExpensePaise: number;
  totalExpensesPaise: number;
  netProfitPaise: number;
  gstOutputPaise: number;
}

export interface TrendPoint {
  month: string;
  revenuePaise: number;
  purchasePaise: number;
  expensePaise: number;
  netProfitPaise: number;
}

export interface DailySalesRow {
  date: string;
  orders: number;
  salesPaise: number;
  cogsPaise: number;
  taxPaise: number;
  grossProfitPaise: number;
}

export interface PurchaseRow {
  date: string;
  type: 'STOCK' | 'DIRECT';
  factory: string;
  qtyBricks: number;
  amountPaise: number;
}

export interface PaymentReportRow {
  date: string;
  direction: 'IN' | 'OUT';
  party: string;
  mode: string;
  amountPaise: number;
}

export interface ExpenseReportRow {
  date: string;
  category: string;
  ref: string;
  amountPaise: number;
}

export interface GstReportRow {
  orderNumber: string;
  date: string;
  customer: string;
  gstin: string;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
}

export interface StockReportRow {
  date: string;
  factory: string;
  brickClass: BrickClass;
  purchased: number;
  sold: number;
  reserved: number;
  available: number;
  ratePaise: number;
}

export interface GeneratedDoc {
  id: string;
  type: string;
  number: string;
  status: 'PENDING' | 'READY' | 'FAILED';
  url?: string | null;
}

export interface StatementOrderRow {
  id: string;
  orderNumber: string;
  orderDate: string;
  deliveryDate?: string | null;
  status: OrderStatus;
  orderType: OrderType;
  brickClass: BrickClass;
  qtyOrdered: number;
  qtyDelivered?: number | null;
  truckType: TruckType;
  truckNumber?: string | null;
  driverName?: string | null;
  invoicePaise: number;
  paidPaise: number;
  balancePaise: number;
}

export interface StatementPaymentRow {
  id: string;
  date: string;
  mode: string;
  type: string;
  amountPaise: number;
  orderNumber?: string | null;
  remarks?: string | null;
}

export interface CustomerStatement {
  customer: { id: string; name: string; phone: string; gstin?: string | null; creditLimitPaise: number };
  orders: StatementOrderRow[];
  payments: StatementPaymentRow[];
  totals: {
    billedDeliveredPaise: number;
    totalPaidPaise: number;
    advancePaise: number;
    netPendingPaise: number;
  };
}

export interface Notification {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  refType?: string | null;
  refId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { name: string; email: string } | null;
}
