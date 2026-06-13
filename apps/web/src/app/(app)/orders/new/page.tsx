'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import {
  computeOrderFinancials,
  formatINR,
  ratePerThousandToPaisePerBrick,
  paisePerBrickToRatePerThousand,
  toPaise,
  lineTotalPaise,
} from '@brick/utils';
import type { BrickClass, OrgSettings } from '@brick/types';
import {
  customersApi,
  factoriesApi,
  ownTrucksApi,
  driversApi,
  hiredTrucksApi,
  stockApi,
  ordersApi,
  settingsApi,
} from '@/lib/resources';
import type { BrickPrice, OrderType, TruckType } from '@/lib/entities';
import { ApiError } from '@/lib/api';
import { enqueueOp, useOfflineStore } from '@/lib/offline';
import { BRICK_LABELS, thousands } from '@/lib/labels';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const rateFor = (prices: BrickPrice[] | undefined, cls: BrickClass): number | null => {
  const p = prices?.find((x) => x.brickClass === cls);
  return p ? Math.round(paisePerBrickToRatePerThousand(p.pricePerBrickPaise)) : null;
};

function ownTruckCostPaise(model: OrgSettings['ownTruckCostModel'], qtyBricks: number): number {
  if (model.type === 'PER_TRIP') return model.amountPaise;
  if (model.type === 'PER_BRICK') return lineTotalPaise(qtyBricks, model.paisePerBrick);
  return 0;
}

export default function NewOrderPage() {
  const router = useRouter();

  const customers = useQuery({ queryKey: ['customers', 'all'], queryFn: () => customersApi.list({ limit: 200 }) });
  const factories = useQuery({ queryKey: ['factories', 'all'], queryFn: () => factoriesApi.list({ limit: 200 }) });
  const ownTrucks = useQuery({ queryKey: ['own-trucks', 'all'], queryFn: () => ownTrucksApi.list({ limit: 200 }) });
  const hiredTrucks = useQuery({ queryKey: ['hired-trucks', 'all'], queryFn: () => hiredTrucksApi.list({ limit: 200 }) });
  const drivers = useQuery({ queryKey: ['drivers', 'all'], queryFn: () => driversApi.list({ limit: 200 }) });
  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  const [orderType, setOrderType] = useState<OrderType>('DIRECT');
  const [customerId, setCustomerId] = useState('');
  const [customerAddressId, setCustomerAddressId] = useState('');
  const [factoryId, setFactoryId] = useState('');
  const [brickClass, setBrickClass] = useState<BrickClass>('FIRST');
  const [qtyThousands, setQtyThousands] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [sellingRate, setSellingRate] = useState('');
  const [stockPicks, setStockPicks] = useState<Record<string, string>>({});
  const [truckType, setTruckType] = useState<TruckType>('OWN');
  const [ownTruckId, setOwnTruckId] = useState('');
  const [hiredTruckId, setHiredTruckId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [hiredCharges, setHiredCharges] = useState('');
  const [isGst, setIsGst] = useState(false);
  const [gstPercent, setGstPercent] = useState('12');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmNow, setConfirmNow] = useState(false);

  const customerDetail = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.get(customerId),
    enabled: Boolean(customerId),
  });
  const factoryDetail = useQuery({
    queryKey: ['factory', factoryId],
    queryFn: () => factoriesApi.get(factoryId),
    enabled: Boolean(factoryId) && orderType === 'DIRECT',
  });
  const stockBatches = useQuery({
    queryKey: ['stock', 'batches', brickClass],
    queryFn: () => stockApi.listBatches({ brickClass, limit: 100 }),
    enabled: orderType === 'STOCK',
  });

  const settings = settingsQ.data?.settings;
  const customerRate = rateFor(customerDetail.data?.currentPrices, brickClass);
  const factoryRate = rateFor(factoryDetail.data?.currentPrices, brickClass);

  // ── Quantities & COGS ──
  const stockQtyBricks = useMemo(
    () =>
      Object.values(stockPicks).reduce((sum, v) => sum + Math.round((Number(v) || 0) * 1000), 0),
    [stockPicks],
  );
  const qtyBricks =
    orderType === 'DIRECT' ? Math.round((Number(qtyThousands) || 0) * 1000) : stockQtyBricks;

  const stockCogsPaise = useMemo(() => {
    if (orderType !== 'STOCK') return undefined;
    return (stockBatches.data?.data ?? []).reduce((sum, b) => {
      const take = Math.round((Number(stockPicks[b.id]) || 0) * 1000);
      return sum + lineTotalPaise(take, b.purchasePricePerBrickPaise);
    }, 0);
  }, [orderType, stockBatches.data, stockPicks]);

  // ── Live preview ──
  const preview = useMemo(() => {
    if (!settings || qtyBricks <= 0 || !sellingRate) return null;
    const sellingPaise = ratePerThousandToPaisePerBrick(Number(sellingRate));
    return computeOrderFinancials({
      qtyBricks,
      purchasePricePerBrickPaise:
        orderType === 'DIRECT' && purchaseRate ? ratePerThousandToPaisePerBrick(Number(purchaseRate)) : null,
      sellingPricePerBrickPaise: sellingPaise,
      truckType,
      hiredTruckChargesPaise: truckType === 'HIRED' && hiredCharges ? toPaise(Number(hiredCharges)) : 0,
      ownTruckCostPaise: truckType === 'OWN' ? ownTruckCostPaise(settings.ownTruckCostModel, qtyBricks) : 0,
      stockCogsPaise,
      gst: { enabled: isGst, rateBasisPoints: Math.round(Number(gstPercent) * 100), interState: false },
    });
  }, [settings, qtyBricks, sellingRate, orderType, purchaseRate, truckType, hiredCharges, stockCogsPaise, isGst, gstPercent]);

  function buildPayload(): Record<string, unknown> {
    const base: Record<string, unknown> = {
      orderType,
      customerId,
      customerAddressId: customerAddressId || undefined,
      brickClass,
      sellingPricePerBrickPaise: ratePerThousandToPaisePerBrick(Number(sellingRate)),
      truckType,
      ownTruckId: truckType === 'OWN' ? ownTruckId || undefined : undefined,
      hiredTruckId: truckType === 'HIRED' ? hiredTruckId || undefined : undefined,
      driverId: driverId || undefined,
      truckChargesPaise: truckType === 'HIRED' && hiredCharges ? toPaise(Number(hiredCharges)) : undefined,
      isGst,
      gstRate: isGst ? Math.round(Number(gstPercent) * 100) : undefined,
      orderDate: new Date(orderDate).toISOString(),
      deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
      deliveryLocation: deliveryLocation || undefined,
      notes: notes || undefined,
      status: confirmNow ? 'CONFIRMED' : 'DRAFT',
    };
    if (orderType === 'DIRECT') {
      base.factoryId = factoryId;
      base.qtyOrdered = qtyBricks;
      base.purchasePricePerBrickPaise = ratePerThousandToPaisePerBrick(Number(purchaseRate));
    } else {
      base.stockItems = Object.entries(stockPicks)
        .map(([stockBatchId, v]) => ({ stockBatchId, qtyTaken: Math.round((Number(v) || 0) * 1000) }))
        .filter((i) => i.qtyTaken > 0);
    }
    return base;
  }

  const create = useMutation({
    mutationFn: () => ordersApi.create(buildPayload()),
    onSuccess: (order) => router.replace(`/orders/${order.id}`),
  });

  // Offline: queue the order locally; it syncs automatically on reconnect.
  async function handleSubmit() {
    if (!useOfflineStore.getState().online) {
      await enqueueOp('order', buildPayload());
      router.replace('/orders');
      return;
    }
    create.mutate();
  }

  const error = create.error instanceof ApiError ? create.error.message : null;

  const canSubmit =
    Boolean(customerId) &&
    qtyBricks > 0 &&
    Boolean(sellingRate) &&
    (orderType === 'DIRECT' ? Boolean(factoryId) && Boolean(purchaseRate) : stockQtyBricks > 0) &&
    (truckType === 'HIRED' ? Boolean(hiredTruckId) : true);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader title="New order" />
      </div>

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        {/* Workflow */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              {(['DIRECT', 'STOCK'] as OrderType[]).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={orderType === t ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setOrderType(t)}
                >
                  {t === 'DIRECT' ? 'Direct (Factory → Customer)' : 'Stock (Yard → Customer)'}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Customer + brick */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer & bricks</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Customer" required>
              <Select
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setCustomerAddressId('');
                }}
                required
              >
                <option value="" disabled>
                  Select customer…
                </option>
                {customers.data?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Delivery site">
              <Select
                value={customerAddressId}
                onChange={(e) => setCustomerAddressId(e.target.value)}
                disabled={!customerDetail.data}
              >
                <option value="">— Select site —</option>
                {customerDetail.data?.addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} · {a.fullAddress}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Brick class" required>
              <Select value={brickClass} onChange={(e) => setBrickClass(e.target.value as BrickClass)}>
                <option value="FIRST">1st Class</option>
                <option value="SECOND">2nd Class</option>
                <option value="THIRD">3rd Class</option>
              </Select>
            </Field>
            <Field
              label="Selling rate (₹/1000)"
              required
              hint={customerRate ? `Negotiated: ₹${customerRate.toLocaleString('en-IN')}` : undefined}
            >
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  value={sellingRate}
                  onChange={(e) => setSellingRate(e.target.value)}
                  required
                />
                {customerRate && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setSellingRate(String(customerRate))}>
                    Use
                  </Button>
                )}
              </div>
            </Field>
          </CardContent>
        </Card>

        {/* Source */}
        {orderType === 'DIRECT' ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Factory & quantity</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Factory / Bhatta" required>
                <Select value={factoryId} onChange={(e) => setFactoryId(e.target.value)} required>
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
              <Field label="Quantity (×1000)" required>
                <Input type="number" min={0} step="0.001" value={qtyThousands} onChange={(e) => setQtyThousands(e.target.value)} required />
              </Field>
              <Field
                label="Purchase rate (₹/1000)"
                required
                hint={factoryRate ? `Factory rate: ₹${factoryRate.toLocaleString('en-IN')}` : undefined}
              >
                <div className="flex gap-2">
                  <Input type="number" min={0} value={purchaseRate} onChange={(e) => setPurchaseRate(e.target.value)} required />
                  {factoryRate && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setPurchaseRate(String(factoryRate))}>
                      Use
                    </Button>
                  )}
                </div>
              </Field>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pick stock batches ({BRICK_LABELS[brickClass]})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stockBatches.data?.data.filter((b) => b.qtyAvailable > 0).length === 0 && (
                <p className="text-sm text-muted-foreground">No available batches for this class.</p>
              )}
              {stockBatches.data?.data
                .filter((b) => b.qtyAvailable > 0)
                .map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                    <div className="flex-1 text-sm">
                      <span className="font-medium">{b.factory?.name}</span> ·{' '}
                      {new Date(b.purchaseDate).toLocaleDateString('en-IN')} · avail{' '}
                      <span className="font-medium">{thousands(b.qtyAvailable)} ×1000</span> · cost{' '}
                      {formatINR(Math.round(paisePerBrickToRatePerThousand(b.purchasePricePerBrickPaise) * 100))}/1000
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={b.qtyAvailable / 1000}
                      step="0.001"
                      placeholder="×1000"
                      className="w-28"
                      value={stockPicks[b.id] ?? ''}
                      onChange={(e) => setStockPicks((p) => ({ ...p, [b.id]: e.target.value }))}
                    />
                  </div>
                ))}
              <p className="text-sm text-muted-foreground">
                Total picked: <span className="font-medium">{thousands(stockQtyBricks)} ×1000</span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Transport */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transport</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Truck type">
              <div className="flex gap-2">
                {(['OWN', 'HIRED'] as TruckType[]).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={truckType === t ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setTruckType(t)}
                  >
                    {t === 'OWN' ? 'Own truck' : 'Hired truck'}
                  </Button>
                ))}
              </div>
            </Field>
            <Field label="Driver">
              <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">— None —</option>
                {drivers.data?.data.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            {truckType === 'OWN' ? (
              <Field label="Own truck" hint="Cost merged into order costing per settings">
                <Select value={ownTruckId} onChange={(e) => setOwnTruckId(e.target.value)}>
                  <option value="">— Select —</option>
                  {ownTrucks.data?.data
                    .filter((t) => !t.isRented)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.number}
                      </option>
                    ))}
                </Select>
              </Field>
            ) : (
              <>
                <Field label="Hired truck" required>
                  <Select value={hiredTruckId} onChange={(e) => setHiredTruckId(e.target.value)} required>
                    <option value="" disabled>
                      Select…
                    </option>
                    {hiredTrucks.data?.data.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.number} {t.ownerName ? `· ${t.ownerName}` : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Trip charges (₹)" hint="Kept separate from brick costing">
                  <Input type="number" min={0} value={hiredCharges} onChange={(e) => setHiredCharges(e.target.value)} />
                </Field>
              </>
            )}
          </CardContent>
        </Card>

        {/* GST + meta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Billing & schedule</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="GST">
              <div className="flex items-center gap-3">
                <Select value={isGst ? 'yes' : 'no'} onChange={(e) => setIsGst(e.target.value === 'yes')}>
                  <option value="no">No GST</option>
                  <option value="yes">Apply GST</option>
                </Select>
                {isGst && (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-24"
                    value={gstPercent}
                    onChange={(e) => setGstPercent(e.target.value)}
                  />
                )}
                {isGst && <span className="text-sm text-muted-foreground">%</span>}
              </div>
            </Field>
            <Field label="Order date" required>
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
            </Field>
            <Field label="Expected delivery">
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </Field>
            <Field label="Delivery location note">
              <Input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Live preview */}
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-lg">Live costing</CardTitle>
          </CardHeader>
          <CardContent>
            {preview ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <Line label="Purchase / COGS" value={formatINR(preview.totalPurchasePaise)} />
                <Line label="Selling (taxable)" value={formatINR(preview.taxableValuePaise)} />
                <Line label="Transport" value={formatINR(preview.transportCostPaise)} />
                {preview.totalTaxPaise > 0 && <Line label="GST" value={formatINR(preview.totalTaxPaise)} />}
                <Line label="Invoice total" value={formatINR(preview.invoiceTotalPaise)} strong />
                <Line label="Gross profit" value={formatINR(preview.grossProfitPaise)} />
                <Line
                  label="Net profit"
                  value={formatINR(preview.netProfitPaise)}
                  strong
                  tone={preview.netProfitPaise < 0 ? 'bad' : 'good'}
                />
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Margin</span>
                  <Badge variant={preview.marginPct < 0 ? 'destructive' : 'success'}>{preview.marginPct}%</Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Enter quantity and selling rate to see costing.</p>
            )}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={confirmNow} onChange={(e) => setConfirmNow(e.target.checked)} />
            Confirm immediately {orderType === 'STOCK' && '(reserves stock)'}
          </label>
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => router.push('/orders')}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={!canSubmit || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create order'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Line({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'good' | 'bad';
}) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={[
          strong ? 'text-base font-semibold' : 'font-medium',
          tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : '',
          tone === 'bad' ? 'text-destructive' : '',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}
