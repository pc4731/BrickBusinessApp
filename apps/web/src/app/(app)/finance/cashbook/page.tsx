'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { formatINR } from '@brick/utils';
import { financeApi } from '@/lib/resources';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CashbookPage() {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const cashbook = useQuery({
    queryKey: ['finance', 'cashbook', dateFrom, dateTo],
    queryFn: () => financeApi.cashbook({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/finance')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Cashbook</h1>
          <p className="text-sm text-muted-foreground">Cash & bank movements</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="From">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </Field>
        {cashbook.data && (
          <div className="ml-auto text-right">
            <p className="text-sm text-muted-foreground">Closing balance</p>
            <p className="text-xl font-semibold">{formatINR(cashbook.data.closingPaise)}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">In</TableHead>
              <TableHead className="text-right">Out</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashbook.data?.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No cash movements.
                </TableCell>
              </TableRow>
            )}
            {cashbook.data?.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.date).toLocaleDateString('en-IN')}</TableCell>
                <TableCell>{r.description}</TableCell>
                <TableCell>
                  <Badge variant="muted">{r.account}</Badge>
                </TableCell>
                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                  {r.inflowPaise ? formatINR(r.inflowPaise) : ''}
                </TableCell>
                <TableCell className="text-right text-destructive">
                  {r.outflowPaise ? formatINR(r.outflowPaise) : ''}
                </TableCell>
                <TableCell className="text-right font-medium">{formatINR(r.balancePaise)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
