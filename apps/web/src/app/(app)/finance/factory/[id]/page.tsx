'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { formatINR } from '@brick/utils';
import { financeApi, factoriesApi } from '@/lib/resources';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function FactoryLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const ledger = useQuery({ queryKey: ['finance', 'ledger', 'factory', id], queryFn: () => financeApi.factoryLedger(id) });
  const factory = useQuery({ queryKey: ['factory', id], queryFn: () => factoriesApi.get(id) });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/finance')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{factory.data?.name ?? 'Factory'} — ledger</h1>
          <p className="text-sm text-muted-foreground">Purchases increase payable, payments reduce it</p>
        </div>
        {ledger.data && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Closing (we owe)</p>
            <p className="text-xl font-semibold">{formatINR(ledger.data.closingPaise)}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Purchase</TableHead>
              <TableHead className="text-right">Payment</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.data?.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No ledger entries.
                </TableCell>
              </TableRow>
            )}
            {ledger.data?.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.date).toLocaleDateString('en-IN')}</TableCell>
                <TableCell>{r.description}</TableCell>
                <TableCell className="text-right">{r.purchasePaise ? formatINR(r.purchasePaise) : ''}</TableCell>
                <TableCell className="text-right">{r.paymentPaise ? formatINR(r.paymentPaise) : ''}</TableCell>
                <TableCell className="text-right font-medium">{formatINR(r.balancePaise)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
