'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi, type AuditQueryParams } from '@/lib/resources';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGOUT'];

type BadgeVariant = 'default' | 'secondary' | 'success' | 'muted' | 'destructive';
const ACTION_VARIANT: Record<string, BadgeVariant> = {
  CREATE: 'success',
  UPDATE: 'default',
  DELETE: 'destructive',
  RESTORE: 'secondary',
  LOGIN: 'muted',
  LOGOUT: 'muted',
};

export default function AuditPage() {
  const [filters, setFilters] = useState<AuditQueryParams>({ page: 1, limit: 30 });
  const set = (patch: Partial<AuditQueryParams>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const q = useQuery({ queryKey: ['audit', filters], queryFn: () => auditApi.list(filters) });

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Who did what, and login activity" />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Action">
          <Select
            className="w-40"
            value={filters.action ?? ''}
            onChange={(e) => set({ action: e.target.value || undefined })}
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Entity type">
          <Input
            className="w-40"
            placeholder="customers, orders…"
            value={filters.entityType ?? ''}
            onChange={(e) => set({ entityType: e.target.value || undefined })}
          />
        </Field>
        <Field label="From">
          <Input type="date" value={filters.dateFrom ?? ''} onChange={(e) => set({ dateFrom: e.target.value || undefined })} />
        </Field>
        <Field label="To">
          <Input type="date" value={filters.dateTo ?? ''} onChange={(e) => set({ dateTo: e.target.value || undefined })} />
        </Field>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading…</TableCell>
              </TableRow>
            )}
            {q.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No activity.</TableCell>
              </TableRow>
            )}
            {q.data?.data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">{new Date(r.createdAt).toLocaleString('en-IN')}</TableCell>
                <TableCell>{r.user?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={ACTION_VARIANT[r.action] ?? 'muted'}>{r.action}</Badge>
                </TableCell>
                <TableCell>
                  {r.entityType}
                  {r.entityId ? <span className="text-muted-foreground"> · {r.entityId.slice(0, 8)}</span> : ''}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.ip ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {q.data && <Pagination meta={q.data.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />}
    </div>
  );
}
