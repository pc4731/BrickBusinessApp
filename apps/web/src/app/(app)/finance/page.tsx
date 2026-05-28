'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, IndianRupee, BarChart3 } from 'lucide-react';
import { formatINR } from '@brick/utils';
import { financeApi, reportsApi } from '@/lib/resources';
import type { CustomerDueRow, FactoryDueRow } from '@/lib/entities';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaymentDialog } from '@/components/payment-dialog';
import { TrendChart } from '@/components/trend-chart';

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={[
            'mt-1 text-2xl font-semibold',
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

export default function FinancePage() {
  const qc = useQueryClient();
  const dashboard = useQuery({ queryKey: ['finance', 'dashboard'], queryFn: () => financeApi.dashboard() });
  const trends = useQuery({ queryKey: ['reports', 'trends'], queryFn: () => reportsApi.trends(6) });
  const customerDues = useQuery({ queryKey: ['finance', 'dues', 'customers'], queryFn: financeApi.customerDues });
  const factoryDues = useQuery({ queryKey: ['finance', 'dues', 'factories'], queryFn: financeApi.factoryDues });

  const [payCustomer, setPayCustomer] = useState<CustomerDueRow | null>(null);
  const [payFactory, setPayFactory] = useState<FactoryDueRow | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['finance'] });

  const pl = dashboard.data?.pl;
  const bal = dashboard.data?.balances;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        subtitle="Profit, receivables, payables and cash position"
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/reports">
                <BarChart3 className="h-4 w-4" /> Reports
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/finance/cashbook">
                <BookOpen className="h-4 w-4" /> Cashbook
              </Link>
            </Button>
          </div>
        }
      />

      {pl && bal && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Revenue" value={formatINR(pl.revenuePaise)} />
            <Kpi label="Gross profit" value={formatINR(pl.grossProfitPaise)} />
            <Kpi
              label="Net profit"
              value={formatINR(pl.netProfitPaise)}
              tone={pl.netProfitPaise < 0 ? 'bad' : 'good'}
            />
            <Kpi label="Expenses" value={formatINR(pl.totalExpensesPaise)} />
            <Kpi label="Cash in hand" value={formatINR(bal.cashPaise)} />
            <Kpi label="Bank balance" value={formatINR(bal.bankPaise)} />
            <Kpi label="Receivable (net)" value={formatINR(bal.netReceivablePaise)} tone="good" />
            <Kpi label="Payable (net)" value={formatINR(bal.netPayablePaise)} tone="bad" />
          </div>
        </>
      )}

      {trends.data && trends.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last 6 months</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trends.data} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer dues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer dues (receivable)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerDues.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      No outstanding dues.
                    </TableCell>
                  </TableRow>
                )}
                {customerDues.data?.map((r) => (
                  <TableRow key={r.customerId}>
                    <TableCell>
                      <Link href={`/finance/customer/${r.customerId}`} className="hover:text-primary hover:underline">
                        {r.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{formatINR(r.pendingPaise)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setPayCustomer(r)}>
                        <IndianRupee className="h-3.5 w-3.5" /> Receive
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Factory dues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Factory dues (payable)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factory</TableHead>
                  <TableHead>Payable</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factoryDues.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      Nothing payable.
                    </TableCell>
                  </TableRow>
                )}
                {factoryDues.data?.map((r) => (
                  <TableRow key={r.factoryId}>
                    <TableCell>
                      <Link href={`/finance/factory/${r.factoryId}`} className="hover:text-primary hover:underline">
                        {r.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{formatINR(r.payablePaise)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setPayFactory(r)}>
                        <IndianRupee className="h-3.5 w-3.5" /> Pay
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {payCustomer && (
        <PaymentDialog
          kind="customer"
          partyId={payCustomer.customerId}
          partyName={payCustomer.name}
          open={Boolean(payCustomer)}
          onOpenChange={(v) => !v && setPayCustomer(null)}
          onSaved={refresh}
        />
      )}
      {payFactory && (
        <PaymentDialog
          kind="factory"
          partyId={payFactory.factoryId}
          partyName={payFactory.name}
          open={Boolean(payFactory)}
          onOpenChange={(v) => !v && setPayFactory(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
