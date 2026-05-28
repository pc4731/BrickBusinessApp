'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertTriangle } from 'lucide-react';
import {
  formatINR,
  toPaise,
  ratePerThousandToPaisePerBrick,
  paisePerBrickToRatePerThousand,
} from '@brick/utils';
import type { BrickClass } from '@brick/types';
import { stockApi, factoriesApi } from '@/lib/resources';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api';
import { BRICK_LABELS, BRICK_SHORT, thousands } from '@/lib/labels';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function StockPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'OWNER' || role === 'MANAGER';

  const summary = useQuery({ queryKey: ['stock', 'summary'], queryFn: stockApi.summary });
  const batches = useQuery({ queryKey: ['stock', 'batches'], queryFn: () => stockApi.listBatches({ limit: 50 }) });
  const factories = useQuery({ queryKey: ['factories', 'all'], queryFn: () => factoriesApi.list({ limit: 100 }) });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    factoryId: '',
    brickClass: 'FIRST' as BrickClass,
    qtyThousands: '',
    rate: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    transport: '',
  });

  const create = useMutation({
    mutationFn: () =>
      stockApi.createBatch({
        factoryId: form.factoryId,
        brickClass: form.brickClass,
        qtyPurchased: Math.round(Number(form.qtyThousands) * 1000),
        purchasePricePerBrickPaise: ratePerThousandToPaisePerBrick(Number(form.rate)),
        purchaseDate: new Date(form.purchaseDate).toISOString(),
        transportCostPaise: form.transport ? toPaise(Number(form.transport)) : 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      setOpen(false);
    },
  });

  const error = create.error instanceof ApiError ? create.error.message : null;

  function openCreate() {
    create.reset();
    setForm({
      factoryId: factories.data?.data[0]?.id ?? '',
      brickClass: 'FIRST',
      qtyThousands: '',
      rate: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      transport: '',
    });
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Stock"
        subtitle="Yard inventory by brick class and purchase batch"
        action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Purchase stock</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.data?.map((row) => (
          <Card key={row.brickClass} className={row.lowStock ? 'border-destructive' : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                {BRICK_LABELS[row.brickClass]}
                {row.lowStock && (
                  <span className="flex items-center gap-1 text-xs font-normal text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Low
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{thousands(row.available)}<span className="text-base text-muted-foreground"> ×1000</span></div>
              <p className="mt-1 text-xs text-muted-foreground">
                available · {thousands(row.reserved)} reserved · {thousands(row.sold)} sold
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mb-2 font-medium">Purchase batches</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Factory</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Rate/1000</TableHead>
              <TableHead>Purchased</TableHead>
              <TableHead>Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No stock batches yet.
                </TableCell>
              </TableRow>
            )}
            {batches.data?.data.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{new Date(b.purchaseDate).toLocaleDateString('en-IN')}</TableCell>
                <TableCell>{b.factory?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{BRICK_SHORT[b.brickClass]}</Badge>
                </TableCell>
                <TableCell>
                  {formatINR(Math.round(paisePerBrickToRatePerThousand(b.purchasePricePerBrickPaise) * 100))}
                </TableCell>
                <TableCell>{thousands(b.qtyPurchased)} ×1000</TableCell>
                <TableCell className="font-medium">{thousands(b.qtyAvailable)} ×1000</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase stock</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <Field label="Factory" required>
              <Select
                value={form.factoryId}
                onChange={(e) => setForm((p) => ({ ...p, factoryId: e.target.value }))}
                required
              >
                <option value="" disabled>
                  Select factory…
                </option>
                {factories.data?.data.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Brick class" required>
                <Select
                  value={form.brickClass}
                  onChange={(e) => setForm((p) => ({ ...p, brickClass: e.target.value as BrickClass }))}
                >
                  <option value="FIRST">1st Class</option>
                  <option value="SECOND">2nd Class</option>
                  <option value="THIRD">3rd Class</option>
                </Select>
              </Field>
              <Field label="Quantity (×1000)" required>
                <Input
                  type="number"
                  min={0}
                  step="0.001"
                  value={form.qtyThousands}
                  onChange={(e) => setForm((p) => ({ ...p, qtyThousands: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Purchase rate (₹/1000)" required>
                <Input
                  type="number"
                  min={0}
                  value={form.rate}
                  onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Transport cost (₹)">
                <Input
                  type="number"
                  min={0}
                  value={form.transport}
                  onChange={(e) => setForm((p) => ({ ...p, transport: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Purchase date">
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm((p) => ({ ...p, purchaseDate: e.target.value }))}
              />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || !form.factoryId}>
                {create.isPending ? 'Saving…' : 'Add batch'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
