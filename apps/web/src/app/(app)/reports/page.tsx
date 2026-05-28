'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { formatINR } from '@brick/utils';
import { reportsApi, type DateRangeParams } from '@/lib/resources';
import { exportsApi } from '@/lib/exports';
import { BRICK_SHORT, thousands } from '@/lib/labels';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const REPORTS = [
  { key: 'pnl', label: 'Profit & Loss' },
  { key: 'daily-sales', label: 'Daily Sales' },
  { key: 'purchases', label: 'Purchase Register' },
  { key: 'payments', label: 'Payment Report' },
  { key: 'expenses', label: 'Expense Report' },
  { key: 'gst', label: 'GST Report' },
  { key: 'stock', label: 'Stock Report' },
] as const;

type ReportKey = (typeof REPORTS)[number]['key'];

export default function ReportsPage() {
  const [report, setReport] = useState<ReportKey>('pnl');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const range: DateRangeParams = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
  const usesDate = report !== 'stock';

  const [downloading, setDownloading] = useState(false);
  async function exportExcel() {
    setDownloading(true);
    try {
      await exportsApi.downloadReportExcel(report, range);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Date-wise business reports and exports" />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <Field label="Report">
            <Select value={report} onChange={(e) => setReport(e.target.value as ReportKey)}>
              {REPORTS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          {usesDate && (
            <>
              <Field label="From">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </Field>
              <Field label="To">
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </Field>
            </>
          )}
          <Button variant="outline" onClick={exportExcel} disabled={downloading}>
            <Download className="h-4 w-4" /> {downloading ? 'Preparing…' : 'Export Excel'}
          </Button>
        </CardContent>
      </Card>

      {report === 'pnl' && <PnlView range={range} />}
      {report === 'daily-sales' && <DailySalesView range={range} />}
      {report === 'purchases' && <PurchasesView range={range} />}
      {report === 'payments' && <PaymentsView range={range} />}
      {report === 'expenses' && <ExpensesView range={range} />}
      {report === 'gst' && <GstView range={range} />}
      {report === 'stock' && <StockView />}
    </div>
  );
}

function ReportTable({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border">{children}</div>;
}

function PnlView({ range }: { range: DateRangeParams }) {
  const q = useQuery({ queryKey: ['reports', 'pnl', range], queryFn: () => reportsApi.pnl(range) });
  if (!q.data) return null;
  const d = q.data;
  const lines: Array<[string, number, boolean?]> = [
    ['Revenue', d.revenuePaise],
    ['Cost of goods sold (COGS)', -d.cogsPaise],
    ['Gross profit', d.grossProfitPaise, true],
    ['Truck expenses', -d.truckExpensePaise],
    ['General expenses', -d.generalExpensePaise],
    ['Net profit', d.netProfitPaise, true],
  ];
  return (
    <Card>
      <CardContent className="pt-6">
        <table className="w-full text-sm">
          <tbody>
            {lines.map(([label, val, strong]) => (
              <tr key={label} className={strong ? 'border-t font-semibold' : ''}>
                <td className="py-2">{label}</td>
                <td className={`py-2 text-right ${val < 0 ? 'text-destructive' : ''}`}>
                  {formatINR(val)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">GST collected (output): {formatINR(d.gstOutputPaise)}</p>
      </CardContent>
    </Card>
  );
}

function DailySalesView({ range }: { range: DateRangeParams }) {
  const q = useQuery({ queryKey: ['reports', 'daily-sales', range], queryFn: () => reportsApi.dailySales(range) });
  return (
    <ReportTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead className="text-right">COGS</TableHead>
            <TableHead className="text-right">GST</TableHead>
            <TableHead className="text-right">Gross profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.data?.length === 0 && (
            <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No sales.</TableCell></TableRow>
          )}
          {q.data?.map((r) => (
            <TableRow key={r.date}>
              <TableCell>{new Date(r.date).toLocaleDateString('en-IN')}</TableCell>
              <TableCell className="text-right">{r.orders}</TableCell>
              <TableCell className="text-right">{formatINR(r.salesPaise)}</TableCell>
              <TableCell className="text-right">{formatINR(r.cogsPaise)}</TableCell>
              <TableCell className="text-right">{formatINR(r.taxPaise)}</TableCell>
              <TableCell className="text-right font-medium">{formatINR(r.grossProfitPaise)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportTable>
  );
}

function PurchasesView({ range }: { range: DateRangeParams }) {
  const q = useQuery({ queryKey: ['reports', 'purchases', range], queryFn: () => reportsApi.purchases(range) });
  return (
    <ReportTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Factory</TableHead>
            <TableHead className="text-right">Qty (×1000)</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.data?.rows.length === 0 && (
            <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No purchases.</TableCell></TableRow>
          )}
          {q.data?.rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{new Date(r.date).toLocaleDateString('en-IN')}</TableCell>
              <TableCell><Badge variant="muted">{r.type}</Badge></TableCell>
              <TableCell>{r.factory}</TableCell>
              <TableCell className="text-right">{thousands(r.qtyBricks)}</TableCell>
              <TableCell className="text-right">{formatINR(r.amountPaise)}</TableCell>
            </TableRow>
          ))}
          {q.data && q.data.rows.length > 0 && (
            <TableRow className="border-t font-semibold">
              <TableCell colSpan={4}>Total</TableCell>
              <TableCell className="text-right">{formatINR(q.data.totalPaise)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ReportTable>
  );
}

function PaymentsView({ range }: { range: DateRangeParams }) {
  const q = useQuery({ queryKey: ['reports', 'payments', range], queryFn: () => reportsApi.payments(range) });
  return (
    <ReportTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Party</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.data?.rows.length === 0 && (
            <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No payments.</TableCell></TableRow>
          )}
          {q.data?.rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{new Date(r.date).toLocaleDateString('en-IN')}</TableCell>
              <TableCell>
                <Badge variant={r.direction === 'IN' ? 'success' : 'destructive'}>
                  {r.direction === 'IN' ? 'Received' : 'Paid'}
                </Badge>
              </TableCell>
              <TableCell>{r.party}</TableCell>
              <TableCell>{r.mode}</TableCell>
              <TableCell className="text-right font-medium">{formatINR(r.amountPaise)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {q.data && (
        <p className="border-t p-3 text-right text-sm">
          Received {formatINR(q.data.receivedPaise)} · Paid {formatINR(q.data.paidPaise)} ·{' '}
          <span className="font-semibold">Net {formatINR(q.data.netPaise)}</span>
        </p>
      )}
    </ReportTable>
  );
}

function ExpensesView({ range }: { range: DateRangeParams }) {
  const q = useQuery({ queryKey: ['reports', 'expenses', range], queryFn: () => reportsApi.expenses(range) });
  return (
    <ReportTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.data?.rows.length === 0 && (
            <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No expenses.</TableCell></TableRow>
          )}
          {q.data?.rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{new Date(r.date).toLocaleDateString('en-IN')}</TableCell>
              <TableCell>{r.category}</TableCell>
              <TableCell className="text-muted-foreground">{r.ref}</TableCell>
              <TableCell className="text-right font-medium">{formatINR(r.amountPaise)}</TableCell>
            </TableRow>
          ))}
          {q.data && q.data.rows.length > 0 && (
            <TableRow className="border-t font-semibold">
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right">{formatINR(q.data.totalPaise)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ReportTable>
  );
}

function GstView({ range }: { range: DateRangeParams }) {
  const q = useQuery({ queryKey: ['reports', 'gst', range], queryFn: () => reportsApi.gst(range) });
  return (
    <ReportTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Taxable</TableHead>
            <TableHead className="text-right">CGST</TableHead>
            <TableHead className="text-right">SGST</TableHead>
            <TableHead className="text-right">IGST</TableHead>
            <TableHead className="text-right">Total tax</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.data?.rows.length === 0 && (
            <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No GST invoices.</TableCell></TableRow>
          )}
          {q.data?.rows.map((r) => (
            <TableRow key={r.orderNumber}>
              <TableCell className="font-medium">{r.orderNumber}</TableCell>
              <TableCell>{new Date(r.date).toLocaleDateString('en-IN')}</TableCell>
              <TableCell>{r.customer}</TableCell>
              <TableCell className="text-right">{formatINR(r.taxablePaise)}</TableCell>
              <TableCell className="text-right">{formatINR(r.cgstPaise)}</TableCell>
              <TableCell className="text-right">{formatINR(r.sgstPaise)}</TableCell>
              <TableCell className="text-right">{formatINR(r.igstPaise)}</TableCell>
              <TableCell className="text-right font-medium">{formatINR(r.totalTaxPaise)}</TableCell>
            </TableRow>
          ))}
          {q.data && q.data.rows.length > 0 && (
            <TableRow className="border-t font-semibold">
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right">{formatINR(q.data.totals.taxablePaise)}</TableCell>
              <TableCell className="text-right">{formatINR(q.data.totals.cgstPaise)}</TableCell>
              <TableCell className="text-right">{formatINR(q.data.totals.sgstPaise)}</TableCell>
              <TableCell className="text-right">{formatINR(q.data.totals.igstPaise)}</TableCell>
              <TableCell className="text-right">{formatINR(q.data.totals.totalTaxPaise)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ReportTable>
  );
}

function StockView() {
  const q = useQuery({ queryKey: ['reports', 'stock'], queryFn: () => reportsApi.stock() });
  return (
    <ReportTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Factory</TableHead>
            <TableHead>Class</TableHead>
            <TableHead className="text-right">Purchased</TableHead>
            <TableHead className="text-right">Sold</TableHead>
            <TableHead className="text-right">Reserved</TableHead>
            <TableHead className="text-right">Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.data?.length === 0 && (
            <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No stock.</TableCell></TableRow>
          )}
          {q.data?.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{new Date(r.date).toLocaleDateString('en-IN')}</TableCell>
              <TableCell>{r.factory}</TableCell>
              <TableCell><Badge variant="secondary">{BRICK_SHORT[r.brickClass]}</Badge></TableCell>
              <TableCell className="text-right">{thousands(r.purchased)}</TableCell>
              <TableCell className="text-right">{thousands(r.sold)}</TableCell>
              <TableCell className="text-right">{thousands(r.reserved)}</TableCell>
              <TableCell className="text-right font-medium">{thousands(r.available)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportTable>
  );
}
