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
  OrgSettingsResponse,
  OwnTruck,
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
