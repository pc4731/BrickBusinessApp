'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import {
  formatINR,
  ratePerThousandToPaisePerBrick,
  paisePerBrickToRatePerThousand,
} from '@brick/utils';
import type { BrickClass } from '@brick/types';
import { factoriesApi } from '@/lib/resources';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const BRICK_LABELS: Record<BrickClass, string> = {
  FIRST: '1st Class',
  SECOND: '2nd Class',
  THIRD: '3rd Class',
};

export default function FactoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'OWNER' || role === 'MANAGER';

  const detail = useQuery({ queryKey: ['factory', id], queryFn: () => factoriesApi.get(id) });
  const prices = useQuery({
    queryKey: ['factory', id, 'prices'],
    queryFn: () => factoriesApi.listPrices(id),
  });

  const [priceClass, setPriceClass] = useState<BrickClass>('FIRST');
  const [priceRate, setPriceRate] = useState('');
  const [priceFrom, setPriceFrom] = useState(new Date().toISOString().slice(0, 10));
  const addPrice = useMutation({
    mutationFn: () =>
      factoriesApi.addPrice(id, {
        brickClass: priceClass,
        pricePerBrickPaise: ratePerThousandToPaisePerBrick(Number(priceRate)),
        effectiveFrom: new Date(priceFrom).toISOString(),
      }),
    onSuccess: () => {
      setPriceRate('');
      qc.invalidateQueries({ queryKey: ['factory', id] });
    },
  });

  if (detail.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (detail.isError || !detail.data) return <p className="text-destructive">Factory not found.</p>;

  const f = detail.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/factories')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{f.name}</h1>
          <p className="text-sm text-muted-foreground">
            {f.ownerName ?? '—'}
            {f.phone ? ` · ${f.phone}` : ''}
            {f.creditDays ? ` · ${f.creditDays}d credit` : ''}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Purchase rates (per 1000)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {f.currentPrices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rates set yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {f.currentPrices.map((p) => (
                <Badge key={p.id} variant="secondary">
                  {BRICK_LABELS[p.brickClass]}:{' '}
                  {formatINR(Math.round(paisePerBrickToRatePerThousand(p.pricePerBrickPaise) * 100))}
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
                <Input type="number" min={0} value={priceRate} onChange={(e) => setPriceRate(e.target.value)} required />
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
                        {formatINR(Math.round(paisePerBrickToRatePerThousand(p.pricePerBrickPaise) * 100))}
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
    </div>
  );
}
