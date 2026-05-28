'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResult } from '@brick/types';
import type { ListParams } from './resource';

interface CrudApi<T, C, U> {
  list: (params?: ListParams) => Promise<PaginatedResult<T>>;
  get: (id: string) => Promise<T>;
  create: (body: C) => Promise<T>;
  update: (id: string, body: U) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

/**
 * Builds the standard list/get/create/update/remove React Query hooks for a
 * resource. Mutations invalidate the resource's query key so lists refetch.
 */
export function makeCrudHooks<T, C = Partial<T>, U = Partial<T>>(
  key: string,
  res: CrudApi<T, C, U>,
) {
  const invalidate = (qc: ReturnType<typeof useQueryClient>) =>
    qc.invalidateQueries({ queryKey: [key] });

  return {
    useList(params?: ListParams) {
      return useQuery({ queryKey: [key, 'list', params], queryFn: () => res.list(params) });
    },
    useOne(id: string | undefined) {
      return useQuery({
        queryKey: [key, 'one', id],
        queryFn: () => res.get(id!),
        enabled: Boolean(id),
      });
    },
    useCreate() {
      const qc = useQueryClient();
      return useMutation({ mutationFn: (body: C) => res.create(body), onSuccess: () => invalidate(qc) });
    },
    useUpdate() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, body }: { id: string; body: U }) => res.update(id, body),
        onSuccess: () => invalidate(qc),
      });
    },
    useRemove() {
      const qc = useQueryClient();
      return useMutation({ mutationFn: (id: string) => res.remove(id), onSuccess: () => invalidate(qc) });
    },
  };
}
