'use client';

import type { PaginatedResult } from '@brick/types';
import { api } from './api';

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
}

function toQuery(params: ListParams = {}): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.limit) sp.set('limit', String(params.limit));
  if (params.search) sp.set('search', params.search);
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/** Generic REST helpers for a paginated resource collection at /<path>. */
export function resource<T, Create = Partial<T>, Update = Partial<T>>(path: string) {
  return {
    list: (params?: ListParams) => api<PaginatedResult<T>>(`/${path}${toQuery(params)}`),
    get: (id: string) => api<T>(`/${path}/${id}`),
    create: (body: Create) => api<T>(`/${path}`, { method: 'POST', body }),
    update: (id: string, body: Update) => api<T>(`/${path}/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => api<void>(`/${path}/${id}`, { method: 'DELETE' }),
  };
}
