'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { formatINR } from '@brick/utils';
import { reportsApi, type DateRangeParams } from '@/lib/resources';
import { exportsApi } from '@/lib/exports';
import { BRICK_SHORT, ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT, thousands } from '@/lib/labels';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={[
            'mt-1 text-xl font-semibold',
            tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : '',
            tone === 'bad' ? 'text-destructive' : '',
          ].join(' ')}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function CustomerStatementView({ customerId }: { customerId: string }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const range: DateRangeParams = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  const q = useQuery({
    queryKey: ['reports', 'customer', customerId, range],
    queryFn: () => reportsApi.customerStatement(customerId, range),
  });

  const [downloading, setDownloading] = useState(false);
  async function exportExcel() {
    setDownloading(true);
    try {
      await exportsApi.downloadReportExcel('customer-statement', { ...range, customerId });
    } finally {
      setDownloading(false);
    }
  }

  if (q.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (q.isError || !q.data) return <p className="text-destructive">Could not load statement.</p>;
  const s = q.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div>
            <p className="text-lg font-semibold">{s.customer.name}</p>
            <p className="text-sm text-muted-foreground">
              {s.customer.phone}
              {s.customer.gstin ? ` · GSTIN ${s.customer.gstin}` : ''} · Credit limit{' '}
              {formatINR(s.customer.creditLimitPaise)}
            </p>
          </div>
          <div className="ml-auto flex items-end gap-3">
            <Field label="From">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </Field>
            <Button variant="outline" onClick={exportExcel} disabled={downloading}>
              <Download className="h-4 w-4" /> {downloading ? 'Preparing…' : 'Excel'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Billed (delivered)" value={formatINR(s.totals.billedDeliveredPaise)} />
        <Stat label="Total received" value={formatINR(s.totals.totalPaidPaise)} tone="good" />
        <Stat label="Advance (unallocated)" value={formatINR(s.totals.advancePaise)} />
        <Stat
          label="Net pending"
          value={formatINR(s.totals.netPendingPaise)}
          tone={s.totals.netPendingPaise > 0 ? 'bad' : 'good'}
        />
      </div>

      {/* Orders */}
      <div>
        <h2 className="mb-2 font-medium">Orders</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Truck</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    No orders.
                  </TableCell>
                </TableRow>
              )}
              {s.orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.orderNumber}</TableCell>
                  <TableCell>{new Date(o.orderDate).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>
                    <Badge variant={ORDER_STATUS_VARIANT[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                  </TableCell>
                  <TableCell>{BRICK_SHORT[o.brickClass]}</TableCell>
                  <TableCell className="text-right">
                    {thousands(o.qtyDelivered ?? o.qtyOrdered)}×1000
                  </TableCell>
                  <TableCell>
                    {o.truckType === 'OWN' ? 'Own' : 'Hired'}
                    {o.truckNumber ? ` · ${o.truckNumber}` : ''}
                  </TableCell>
                  <TableCell className="text-right">{formatINR(o.invoicePaise)}</TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                    {o.paidPaise ? formatINR(o.paidPaise) : '—'}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${o.balancePaise > 0 ? 'text-destructive' : ''}`}>
                    {formatINR(o.balancePaise)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Payments */}
      <div>
        <h2 className="mb-2 font-medium">Payments & advances</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Against</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No payments.
                  </TableCell>
                </TableRow>
              )}
              {s.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.date).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>
                    {p.orderNumber ? (
                      <span className="font-medium">{p.orderNumber}</span>
                    ) : (
                      <Badge variant="secondary">Advance</Badge>
                    )}
                  </TableCell>
                  <TableCell>{p.mode}</TableCell>
                  <TableCell>{p.type.charAt(0) + p.type.slice(1).toLowerCase()}</TableCell>
                  <TableCell className="text-muted-foreground">{p.remarks ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium">{formatINR(p.amountPaise)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
