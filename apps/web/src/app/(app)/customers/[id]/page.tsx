'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, FileText } from 'lucide-react';
import {
  formatINR,
  ratePerThousandToPaisePerBrick,
  paisePerBrickToRatePerThousand,
} from '@brick/utils';
import type { BrickClass } from '@brick/types';
import { customersApi } from '@/lib/resources';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const BRICK_LABELS: Record<BrickClass, string> = {
  FIRST: '1st Class',
  SECOND: '2nd Class',
  THIRD: '3rd Class',
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'OWNER' || role === 'MANAGER';

  const detail = useQuery({ queryKey: ['customer', id], queryFn: () => customersApi.get(id) });
  const prices = useQuery({
    queryKey: ['customer', id, 'prices'],
    queryFn: () => customersApi.listPrices(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['customer', id] });
  };

  // ── Add price ──
  const [priceClass, setPriceClass] = useState<BrickClass>('FIRST');
  const [priceRate, setPriceRate] = useState('');
  const [priceFrom, setPriceFrom] = useState(new Date().toISOString().slice(0, 10));
  const addPrice = useMutation({
    mutationFn: () =>
      customersApi.addPrice(id, {
        brickClass: priceClass,
        pricePerBrickPaise: ratePerThousandToPaisePerBrick(Number(priceRate)),
        effectiveFrom: new Date(priceFrom).toISOString(),
      }),
    onSuccess: () => {
      setPriceRate('');
      invalidate();
    },
  });

  // ── Add address ──
  const [label, setLabel] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const addAddress = useMutation({
    mutationFn: () =>
      customersApi.addAddress(id, { label, fullAddress, isDefault }),
    onSuccess: () => {
      setLabel('');
      setFullAddress('');
      setIsDefault(false);
      invalidate();
    },
  });
  const removeAddress = useMutation({
    mutationFn: (addressId: string) => customersApi.removeAddress(id, addressId),
    onSuccess: invalidate,
  });

  if (detail.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (detail.isError || !detail.data)
    return <p className="text-destructive">Customer not found.</p>;

  const c = detail.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/customers')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{c.name}</h1>
          <p className="text-sm text-muted-foreground">
            {c.phone}
            {c.gstin ? ` · GSTIN ${c.gstin}` : ''} · Credit {formatINR(c.creditLimitPaise)}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/reports/customer/${id}`)}>
          <FileText className="h-4 w-4" /> Statement
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current rates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Negotiated rates (per 1000)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {c.currentPrices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rates set yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {c.currentPrices.map((p) => (
                  <Badge key={p.id} variant="secondary">
                    {BRICK_LABELS[p.brickClass]}:{' '}
                    {formatINR(
                      Math.round(paisePerBrickToRatePerThousand(p.pricePerBrickPaise) * 100),
                    )}
                  </Badge>
                ))}
              </div>
            )}

            {canManage && (
              <form
                className="grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addPrice.mutate();
                }}
              >
                <Field label="Class">
                  <Select value={priceClass} onChange={(e) => setPriceClass(e.target.value as BrickClass)}>
                    <option value="FIRST">1st</option>
                    <option value="SECOND">2nd</option>
                    <option value="THIRD">3rd</option>
                  </Select>
                </Field>
                <Field label="₹ / 1000">
                  <Input
                    type="number"
                    min={0}
                    value={priceRate}
                    onChange={(e) => setPriceRate(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Effective from">
                  <Input type="date" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} />
                </Field>
                <div className="flex items-end">
                  <Button type="submit" className="w-full" disabled={addPrice.isPending || !priceRate}>
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
              </form>
            )}

            {prices.data && prices.data.length > 0 && (
              <div className="border-t pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Price history</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>₹/1000</TableHead>
                      <TableHead>From</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prices.data.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{BRICK_LABELS[p.brickClass]}</TableCell>
                        <TableCell>
                          {formatINR(
                            Math.round(paisePerBrickToRatePerThousand(p.pricePerBrickPaise) * 100),
                          )}
                        </TableCell>
                        <TableCell>{new Date(p.effectiveFrom).toLocaleDateString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Addresses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivery sites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {c.addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sites yet.</p>
            ) : (
              <ul className="space-y-2">
                {c.addresses.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-2 rounded-md border p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.label}</span>
                        {a.isDefault && <Badge>Default</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{a.fullAddress}</p>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAddress.mutate(a.id)}
                        aria-label="Remove site"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canManage && (
              <form
                className="space-y-3 border-t pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addAddress.mutate();
                }}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Label" required>
                    <Input value={label} onChange={(e) => setLabel(e.target.value)} required />
                  </Field>
                  <Field label="Full address" required>
                    <Input
                      value={fullAddress}
                      onChange={(e) => setFullAddress(e.target.value)}
                      required
                    />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                  />
                  Set as default site
                </label>
                <Button type="submit" disabled={addAddress.isPending || !label || !fullAddress}>
                  <Plus className="h-4 w-4" /> Add site
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
