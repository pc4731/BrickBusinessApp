'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { formatINR } from '@brick/utils';
import { reportsApi, type DateRangeParams } from '@/lib/resources';
import { exportsApi } from '@/lib/exports';
import type { TruckRentalStatus } from '@/lib/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const STATUS_VARIANT: Record<TruckRentalStatus, 'default' | 'success' | 'muted'> = {
  ACTIVE: 'default',
  COMPLETED: 'success',
  CANCELLED: 'muted',
};

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

export function RentalStatementView({ renter }: { renter: string }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const range: DateRangeParams = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  const q = useQuery({
    queryKey: ['reports', 'rental-statement', renter, range],
    queryFn: () => reportsApi.rentalStatement(renter, range),
  });

  const [downloading, setDownloading] = useState(false);
  async function exportExcel() {
    setDownloading(true);
    try {
      await exportsApi.downloadReportExcel('rental-statement', { ...range, renter });
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
            <p className="text-lg font-semibold">{s.renter}</p>
            <p className="text-sm text-muted-foreground">
              {s.rentals.length} rental{s.rentals.length === 1 ? '' : 's'}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Agreed rent" value={formatINR(s.totals.totalRentPaise)} />
        <Stat label="Total received" value={formatINR(s.totals.totalPaidPaise)} tone="good" />
        <Stat
          label="Pending"
          value={formatINR(s.totals.pendingPaise)}
          tone={s.totals.pendingPaise > 0 ? 'bad' : 'good'}
        />
      </div>

      {/* Rentals */}
      <div>
        <h2 className="mb-2 font-medium">Rentals</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Truck</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Agreed rent</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.rentals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No rentals.
                  </TableCell>
                </TableRow>
              )}
              {s.rentals.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.truckNumber}</TableCell>
                  <TableCell>{new Date(r.startDate).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>
                    {r.endDate ? new Date(r.endDate).toLocaleDateString('en-IN') : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatINR(r.rentAmountPaise)}</TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                    {r.paidPaise ? formatINR(r.paidPaise) : '—'}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${r.pendingPaise > 0 ? 'text-destructive' : ''}`}
                  >
                    {formatINR(r.pendingPaise)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Rent payments */}
      <div>
        <h2 className="mb-2 font-medium">Rent payments</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Truck</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No payments.
                  </TableCell>
                </TableRow>
              )}
              {s.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.date).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>{p.truckNumber}</TableCell>
                  <TableCell>{p.mode}</TableCell>
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
