'use client';

import type { PaginatedResult } from '@brick/types';
import { api } from './api';
import { resource, type ListParams } from './resource';
import type {
  AuditLogRow,
  BrickPrice,
  CashbookRow,
  Customer,
  CustomerAddress,
  CustomerDetail,
  CustomerDueRow,
  CustomerLedgerRow,
  CustomerPaymentRow,
  CustomerStatement,
  Driver,
  Notification,
  Factory,
  FactoryDetail,
  FactoryDueRow,
  FactoryLedgerRow,
  DailySalesRow,
  ExpenseReportRow,
  FinanceDashboard,
  GeneralExpenseRow,
  GstReportRow,
  HiredTruck,
  Order,
  OrgSettingsResponse,
  OwnTruck,
  PaymentReportRow,
  PnlReport,
  PurchaseRow,
  StockBatch,
  StockReportRow,
  StockSummaryRow,
  TrendPoint,
  TruckExpenseRow,
  TruckRental,
  TruckRentalPaymentRow,
  UserRow,
} from './entities';

export const customersApi = {
  ...resource<Customer>('customers'),
  get: (id: string) => api<CustomerDetail>(`/customers/${id}`),
  listAddresses: (id: string) => api<CustomerAddress[]>(`/customers/${id}/addresses`),
  addAddress: (id: string, body: Partial<CustomerAddress>) =>
    api<CustomerAddress>(`/customers/${id}/addresses`, { method: 'POST', body }),
  removeAddress: (id: string, addressId: string) =>
    api<void>(`/customers/${id}/addresses/${addressId}`, { method: 'DELETE' }),
  listPrices: (id: string) => api<BrickPrice[]>(`/customers/${id}/prices`),
  addPrice: (id: string, body: Partial<BrickPrice>) =>
    api<BrickPrice>(`/customers/${id}/prices`, { method: 'POST', body }),
};

export const factoriesApi = {
  ...resource<Factory>('factories'),
  get: (id: string) => api<FactoryDetail>(`/factories/${id}`),
  listPrices: (id: string) => api<BrickPrice[]>(`/factories/${id}/prices`),
  addPrice: (id: string, body: Partial<BrickPrice>) =>
    api<BrickPrice>(`/factories/${id}/prices`, { method: 'POST', body }),
};

export const ownTrucksApi = resource<OwnTruck>('own-trucks');
export const driversApi = resource<Driver>('drivers');
export const hiredTrucksApi = resource<HiredTruck>('hired-trucks');

export interface RentalListParams extends ListParams {
  status?: string;
  ownTruckId?: string;
}

export const rentalsApi = {
  list: (params?: RentalListParams) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.search) sp.set('search', params.search);
    if (params?.status) sp.set('status', params.status);
    if (params?.ownTruckId) sp.set('ownTruckId', params.ownTruckId);
    const qs = sp.toString();
    return api<PaginatedResult<TruckRental>>(`/truck-rentals${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api<TruckRental>(`/truck-rentals/${id}`),
  create: (body: Record<string, unknown>) =>
    api<TruckRental>('/truck-rentals', { method: 'POST', body }),
  setStatus: (id: string, status: string) =>
    api<TruckRental>(`/truck-rentals/${id}/status`, { method: 'PATCH', body: { status } }),
  remove: (id: string) => api<void>(`/truck-rentals/${id}`, { method: 'DELETE' }),
  listPayments: (id: string) => api<TruckRentalPaymentRow[]>(`/truck-rentals/${id}/payments`),
  recordPayment: (id: string, body: Record<string, unknown>) =>
    api<TruckRentalPaymentRow>(`/truck-rentals/${id}/payments`, { method: 'POST', body }),
  removePayment: (paymentId: string) =>
    api<void>(`/truck-rentals/payments/${paymentId}`, { method: 'DELETE' }),
};

export interface StockListParams extends ListParams {
  brickClass?: string;
  factoryId?: string;
}

export const stockApi = {
  summary: () => api<StockSummaryRow[]>('/stock/summary'),
  listBatches: (params?: StockListParams) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.brickClass) sp.set('brickClass', params.brickClass);
    if (params?.factoryId) sp.set('factoryId', params.factoryId);
    const qs = sp.toString();
    return api<PaginatedResult<StockBatch>>(`/stock/batches${qs ? `?${qs}` : ''}`);
  },
  createBatch: (body: Record<string, unknown>) =>
    api<StockBatch>('/stock/batches', { method: 'POST', body }),
};

export interface OrderListParams extends ListParams {
  status?: string;
  orderType?: string;
  customerId?: string;
  factoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const ordersApi = {
  list: (params?: OrderListParams) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.search) sp.set('search', params.search);
    if (params?.status) sp.set('status', params.status);
    if (params?.orderType) sp.set('orderType', params.orderType);
    if (params?.customerId) sp.set('customerId', params.customerId);
    if (params?.factoryId) sp.set('factoryId', params.factoryId);
    if (params?.dateFrom) sp.set('dateFrom', params.dateFrom);
    if (params?.dateTo) sp.set('dateTo', params.dateTo);
    const qs = sp.toString();
    return api<PaginatedResult<Order>>(`/orders${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api<Order>(`/orders/${id}`),
  create: (body: Record<string, unknown>) => api<Order>('/orders', { method: 'POST', body }),
  update: (id: string, body: Record<string, unknown>) =>
    api<Order>(`/orders/${id}`, { method: 'PATCH', body }),
  transition: (id: string, body: Record<string, unknown>) =>
    api<Order>(`/orders/${id}/status`, { method: 'PATCH', body }),
};

export const settingsApi = {
  get: () => api<OrgSettingsResponse>('/settings'),
  update: (body: Record<string, unknown>) =>
    api<OrgSettingsResponse>('/settings', { method: 'PATCH', body }),
};

export const usersApi = {
  list: () => api<UserRow[]>('/users'),
  create: (body: Record<string, unknown>) => api<UserRow>('/users', { method: 'POST', body }),
  update: (id: string, body: Record<string, unknown>) =>
    api<UserRow>(`/users/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => api<void>(`/users/${id}`, { method: 'DELETE' }),
};

export interface DateRangeParams {
  dateFrom?: string;
  dateTo?: string;
}

function rangeQs(params?: DateRangeParams): string {
  const sp = new URLSearchParams();
  if (params?.dateFrom) sp.set('dateFrom', params.dateFrom);
  if (params?.dateTo) sp.set('dateTo', params.dateTo);
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export const financeApi = {
  dashboard: (params?: DateRangeParams) =>
    api<FinanceDashboard>(`/finance/dashboard${rangeQs(params)}`),
  customerDues: () => api<CustomerDueRow[]>('/finance/dues/customers'),
  factoryDues: () => api<FactoryDueRow[]>('/finance/dues/factories'),
  customerLedger: (customerId: string) =>
    api<{ rows: CustomerLedgerRow[]; closingPaise: number }>(`/finance/ledger/customer/${customerId}`),
  factoryLedger: (factoryId: string) =>
    api<{ rows: FactoryLedgerRow[]; closingPaise: number }>(`/finance/ledger/factory/${factoryId}`),
  cashbook: (params?: DateRangeParams) =>
    api<{ rows: CashbookRow[]; closingPaise: number }>(`/finance/cashbook${rangeQs(params)}`),
};

export const paymentsApi = {
  createCustomerPayment: (body: Record<string, unknown>) =>
    api<CustomerPaymentRow>('/customer-payments', { method: 'POST', body }),
  listCustomerPayments: (params: { customerId?: string; orderId?: string }) => {
    const sp = new URLSearchParams();
    if (params.customerId) sp.set('customerId', params.customerId);
    if (params.orderId) sp.set('orderId', params.orderId);
    const qs = sp.toString();
    return api<CustomerPaymentRow[]>(`/customer-payments${qs ? `?${qs}` : ''}`);
  },
  removeCustomerPayment: (id: string) =>
    api<void>(`/customer-payments/${id}`, { method: 'DELETE' }),
  createFactoryPayment: (body: Record<string, unknown>) =>
    api('/factory-payments', { method: 'POST', body }),
  listFactoryPayments: (params: { factoryId?: string; orderId?: string }) => {
    const sp = new URLSearchParams();
    if (params.factoryId) sp.set('factoryId', params.factoryId);
    if (params.orderId) sp.set('orderId', params.orderId);
    const qs = sp.toString();
    return api(`/factory-payments${qs ? `?${qs}` : ''}`);
  },
  createTruckExpense: (body: Record<string, unknown>) =>
    api('/truck-expenses', { method: 'POST', body }),
  listTruckExpenses: () => api<TruckExpenseRow[]>('/truck-expenses'),
  removeTruckExpense: (id: string) => api<void>(`/truck-expenses/${id}`, { method: 'DELETE' }),
  createGeneralExpense: (body: Record<string, unknown>) =>
    api('/general-expenses', { method: 'POST', body }),
  listGeneralExpenses: () => api<GeneralExpenseRow[]>('/general-expenses'),
  removeGeneralExpense: (id: string) => api<void>(`/general-expenses/${id}`, { method: 'DELETE' }),
};

export const reportsApi = {
  pnl: (p?: DateRangeParams) => api<PnlReport>(`/reports/pnl${rangeQs(p)}`),
  trends: (months = 6) => api<TrendPoint[]>(`/reports/trends?months=${months}`),
  dailySales: (p?: DateRangeParams) => api<DailySalesRow[]>(`/reports/daily-sales${rangeQs(p)}`),
  purchases: (p?: DateRangeParams) =>
    api<{ rows: PurchaseRow[]; totalPaise: number }>(`/reports/purchases${rangeQs(p)}`),
  payments: (p?: DateRangeParams) =>
    api<{ rows: PaymentReportRow[]; receivedPaise: number; paidPaise: number; netPaise: number }>(
      `/reports/payments${rangeQs(p)}`,
    ),
  expenses: (p?: DateRangeParams) =>
    api<{ rows: ExpenseReportRow[]; totalPaise: number }>(`/reports/expenses${rangeQs(p)}`),
  gst: (p?: DateRangeParams) =>
    api<{ rows: GstReportRow[]; totals: Omit<GstReportRow, 'orderNumber' | 'date' | 'customer' | 'gstin'> }>(
      `/reports/gst${rangeQs(p)}`,
    ),
  stock: () => api<StockReportRow[]>('/reports/stock'),
  customerStatement: (customerId: string, p?: DateRangeParams) =>
    api<CustomerStatement>(`/reports/customer/${customerId}${rangeQs(p)}`),
};

export const notificationsApi = {
  list: () => api<Notification[]>('/notifications'),
  unreadCount: () => api<{ count: number }>('/notifications/unread-count'),
  refresh: () =>
    api<{ created: number; removed: number; total: number }>('/notifications/refresh', { method: 'POST' }),
  markRead: (id: string) => api<void>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => api<void>('/notifications/read-all', { method: 'PATCH' }),
};

export interface AuditQueryParams {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const auditApi = {
  list: (params: AuditQueryParams = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v != null && v !== '' && sp.set(k, String(v)));
    const qs = sp.toString();
    return api<PaginatedResult<AuditLogRow>>(`/audit-logs${qs ? `?${qs}` : ''}`);
  },
};

export type { ListParams, PaginatedResult };
