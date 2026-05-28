'use client';

import type { PaginatedResult } from '@brick/types';
import { api } from './api';
import { resource, type ListParams } from './resource';
import type {
  BrickPrice,
  Customer,
  CustomerAddress,
  CustomerDetail,
  Driver,
  Factory,
  FactoryDetail,
  HiredTruck,
  Order,
  OrgSettingsResponse,
  OwnTruck,
  StockBatch,
  StockSummaryRow,
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

export type { ListParams, PaginatedResult };
