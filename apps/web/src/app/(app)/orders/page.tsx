'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { formatINR } from '@brick/utils';
import { OrderStatuses, OrderTypes } from '@brick/types';
import { ordersApi, type OrderListParams } from '@/lib/resources';
import { useAuthStore } from '@/lib/auth-store';
import { BRICK_SHORT, ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT, thousands } from '@/lib/labels';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function OrdersPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'OWNER' || role === 'MANAGER';

  const [filters, setFilters] = useState<OrderListParams>({ page: 1 });
  const set = (patch: Partial<OrderListParams>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const list = useQuery({ queryKey: ['orders', filters], queryFn: () => ordersApi.list(filters) });

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Direct deliveries and stock sales"
        action={
          canManage && (
            <Button asChild>
              <Link href="/orders/new">
                <Plus className="h-4 w-4" /> New order
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
          <Input
            className="pl-9"
            placeholder="Search order # or customer…"
            value={filters.search ?? ''}
            onChange={(e) => set({ search: e.target.value || undefined })}
          />
        </div>
        <Select
          className="w-auto"
          value={filters.status ?? ''}
          onChange={(e) => set({ status: e.target.value || undefined })}
        >
          <option value="">All statuses</option>
          {OrderStatuses.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto"
          value={filters.orderType ?? ''}
          onChange={(e) => set({ orderType: e.target.value || undefined })}
        >
          <option value="">All types</option>
          {OrderTypes.map((t) => (
            <option key={t} value={t}>
              {t === 'DIRECT' ? 'Direct' : 'Stock'}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Net profit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {list.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No orders match these filters.
                </TableCell>
              </TableRow>
            )}
            {list.data?.data.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">
                  <Link href={`/orders/${o.id}`} className="hover:text-primary hover:underline">
                    {o.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>{new Date(o.orderDate).toLocaleDateString('en-IN')}</TableCell>
                <TableCell>{o.customer?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="muted">{o.orderType === 'DIRECT' ? 'Direct' : 'Stock'}</Badge>
                </TableCell>
                <TableCell>
                  {thousands(o.qtyDelivered ?? o.qtyOrdered)} ×1000 {BRICK_SHORT[o.brickClass]}
                </TableCell>
                <TableCell>{formatINR(o.summary.invoiceTotalPaise)}</TableCell>
                <TableCell className={o.summary.netProfitPaise < 0 ? 'text-destructive' : ''}>
                  {formatINR(o.summary.netProfitPaise)}
                </TableCell>
                <TableCell>
                  <Badge variant={ORDER_STATUS_VARIANT[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {list.data && <Pagination meta={list.data.meta} onPage={(page) => setFilters((f) => ({ ...f, page }))} />}
    </div>
  );
}
