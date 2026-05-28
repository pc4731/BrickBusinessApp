'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Truck, Package, CheckCircle2, XCircle, IndianRupee, FileText } from 'lucide-react';
import { formatINR, paisePerBrickToRatePerThousand } from '@brick/utils';
import { ordersApi, paymentsApi } from '@/lib/resources';
import { exportsApi } from '@/lib/exports';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api';
import type { Order, OrderStatus } from '@/lib/entities';
import { BRICK_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT, thousands } from '@/lib/labels';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PaymentDialog } from '@/components/payment-dialog';

const rate1000 = (paisePerBrick?: number | null) =>
  paisePerBrick != null ? formatINR(Math.round(paisePerBrickToRatePerThousand(paisePerBrick) * 100)) : '—';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'OWNER' || role === 'MANAGER';

  const canFinance = role === 'OWNER' || role === 'MANAGER' || role === 'ACCOUNTANT';
  const order = useQuery({ queryKey: ['order', id], queryFn: () => ordersApi.get(id) });
  const payments = useQuery({
    queryKey: ['customer-payments', 'order', id],
    queryFn: () => paymentsApi.listCustomerPayments({ orderId: id }),
  });
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [payCustomerOpen, setPayCustomerOpen] = useState(false);
  const [payFactoryOpen, setPayFactoryOpen] = useState(false);
  const [docBusy, setDocBusy] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  async function generateDoc(type: 'INVOICE' | 'CHALLAN' | 'RECEIPT') {
    setDocBusy(type);
    setDocError(null);
    try {
      await exportsApi.generateAndDownload(type, id);
    } catch (e) {
      setDocError(e instanceof Error ? e.message : 'Failed to generate document');
    } finally {
      setDocBusy(null);
    }
  }

  const refreshFinance = () => {
    qc.invalidateQueries({ queryKey: ['customer-payments', 'order', id] });
    qc.invalidateQueries({ queryKey: ['finance'] });
  };

  const transition = useMutation({
    mutationFn: (body: Record<string, unknown>) => ordersApi.transition(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      setDeliverOpen(false);
    },
  });

  if (order.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (order.isError || !order.data) return <p className="text-destructive">Order not found.</p>;

  const o = order.data;
  const s = o.summary;
  const transitionError = transition.error instanceof ApiError ? transition.error.message : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{o.orderNumber}</h1>
            <Badge variant={ORDER_STATUS_VARIANT[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
            <Badge variant="muted">{o.orderType === 'DIRECT' ? 'Direct' : 'Stock'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {o.customer?.name} · {new Date(o.orderDate).toLocaleDateString('en-IN')}
          </p>
        </div>
      </div>

      {canManage && o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && (
        <StatusActions
          order={o}
          pending={transition.isPending}
          onConfirm={() => transition.mutate({ status: 'CONFIRMED' })}
          onTransit={() => transition.mutate({ status: 'IN_TRANSIT' })}
          onDeliver={() => setDeliverOpen(true)}
          onCancel={() => transition.mutate({ status: 'CANCELLED' })}
        />
      )}
      {transitionError && <p className="text-sm text-destructive">{transitionError}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Brick class" value={BRICK_LABELS[o.brickClass]} />
            <Row label="Quantity ordered" value={`${thousands(o.qtyOrdered)} ×1000`} />
            {o.qtyDelivered != null && (
              <Row label="Quantity delivered" value={`${thousands(o.qtyDelivered)} ×1000`} />
            )}
            {o.qtyDiscrepancy > 0 && (
              <Row label="Count discrepancy" value={`${o.qtyDiscrepancy} bricks`} />
            )}
            {o.orderType === 'DIRECT' && (
              <>
                <Row label="Factory" value={o.factory?.name ?? '—'} />
                <Row label="Purchase rate" value={`${rate1000(o.purchasePricePerBrickPaise)}/1000`} />
              </>
            )}
            <Row label="Selling rate" value={`${rate1000(o.sellingPricePerBrickPaise)}/1000`} />
            <Row
              label="Transport"
              value={
                o.truckType === 'OWN'
                  ? `Own${o.ownTruck ? ` · ${o.ownTruck.number}` : ''}`
                  : `Hired${o.hiredTruck ? ` · ${o.hiredTruck.number}` : ''}`
              }
            />
            {o.driver && <Row label="Driver" value={o.driver.name} />}
            {o.customerAddress && <Row label="Delivery site" value={o.customerAddress.fullAddress} />}
            {o.notes && <Row label="Notes" value={o.notes} />}
          </CardContent>
        </Card>

        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-lg">Costing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Purchase / COGS" value={formatINR(s.totalPurchasePaise)} />
            <Row label="Selling (taxable)" value={formatINR(s.taxableValuePaise)} />
            <Row label="Transport" value={formatINR(s.transportCostPaise)} />
            {s.totalTaxPaise > 0 && (
              <>
                {s.igstPaise > 0 ? (
                  <Row label="IGST" value={formatINR(s.igstPaise)} />
                ) : (
                  <>
                    <Row label="CGST" value={formatINR(s.cgstPaise)} />
                    <Row label="SGST" value={formatINR(s.sgstPaise)} />
                  </>
                )}
              </>
            )}
            <div className="my-2 border-t" />
            <Row label="Invoice total" value={formatINR(s.invoiceTotalPaise)} strong />
            <Row label="Gross profit" value={formatINR(s.grossProfitPaise)} />
            <Row
              label="Net profit"
              value={formatINR(s.netProfitPaise)}
              strong
              tone={s.netProfitPaise < 0 ? 'bad' : 'good'}
            />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Margin</span>
              <Badge variant={s.marginPct < 0 ? 'destructive' : 'success'}>{s.marginPct}%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {o.orderType === 'STOCK' && o.stockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stock batches used</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {o.stockItems.map((it) => (
              <div key={it.id} className="flex items-center justify-between border-b py-1 last:border-0">
                <span>
                  {thousands(it.qtyTaken)} ×1000 @ {rate1000(it.purchasePricePerBrickPaise)}/1000
                </span>
                <span className="text-muted-foreground">
                  {it.stockBatch ? new Date(it.stockBatch.purchaseDate).toLocaleDateString('en-IN') : ''}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Documents</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => generateDoc('INVOICE')} disabled={docBusy !== null}>
              <FileText className="h-4 w-4" /> {docBusy === 'INVOICE' ? 'Generating…' : 'Invoice'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => generateDoc('CHALLAN')} disabled={docBusy !== null}>
              <FileText className="h-4 w-4" /> {docBusy === 'CHALLAN' ? 'Generating…' : 'Challan'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => generateDoc('RECEIPT')} disabled={docBusy !== null}>
              <FileText className="h-4 w-4" /> {docBusy === 'RECEIPT' ? 'Generating…' : 'Receipt'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {docError ? (
            <span className="text-destructive">{docError}</span>
          ) : (
            'Generate a PDF invoice, delivery challan, or payment receipt for this order.'
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Customer payments</CardTitle>
          {canFinance && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPayCustomerOpen(true)}>
                <IndianRupee className="h-4 w-4" /> Receive payment
              </Button>
              {o.orderType === 'DIRECT' && o.factory && (
                <Button size="sm" variant="outline" onClick={() => setPayFactoryOpen(true)}>
                  <IndianRupee className="h-4 w-4" /> Pay factory
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {payments.data?.length === 0 && (
            <p className="text-muted-foreground">No payments recorded for this order.</p>
          )}
          {payments.data?.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b py-1 last:border-0">
              <span>
                {new Date(p.paymentDate).toLocaleDateString('en-IN')} · {p.paymentMode}
                {p.remarks ? ` · ${p.remarks}` : ''}
              </span>
              <span className="font-medium">{formatINR(p.amountPaise)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <DeliverDialog
        open={deliverOpen}
        onOpenChange={setDeliverOpen}
        order={o}
        pending={transition.isPending}
        onSubmit={(body) => transition.mutate({ status: 'DELIVERED', ...body })}
      />

      {o.customer && (
        <PaymentDialog
          kind="customer"
          partyId={o.customerId}
          partyName={o.customer.name}
          orderId={o.id}
          open={payCustomerOpen}
          onOpenChange={setPayCustomerOpen}
          onSaved={refreshFinance}
        />
      )}
      {o.factory && (
        <PaymentDialog
          kind="factory"
          partyId={o.factory.id}
          partyName={o.factory.name}
          orderId={o.id}
          open={payFactoryOpen}
          onOpenChange={setPayFactoryOpen}
          onSaved={refreshFinance}
        />
      )}
    </div>
  );
}

function StatusActions({
  order,
  pending,
  onConfirm,
  onTransit,
  onDeliver,
  onCancel,
}: {
  order: Order;
  pending: boolean;
  onConfirm: () => void;
  onTransit: () => void;
  onDeliver: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {order.status === 'DRAFT' && (
        <Button onClick={onConfirm} disabled={pending}>
          <CheckCircle2 className="h-4 w-4" /> Confirm
        </Button>
      )}
      {order.status === 'CONFIRMED' && (
        <Button onClick={onTransit} disabled={pending}>
          <Truck className="h-4 w-4" /> Mark in transit
        </Button>
      )}
      {order.status === 'IN_TRANSIT' && (
        <Button onClick={onDeliver} disabled={pending}>
          <Package className="h-4 w-4" /> Mark delivered
        </Button>
      )}
      <Button variant="outline" onClick={onCancel} disabled={pending}>
        <XCircle className="h-4 w-4" /> Cancel order
      </Button>
    </div>
  );
}

function DeliverDialog({
  open,
  onOpenChange,
  order,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: Order;
  pending: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const isStock = order.orderType === 'STOCK';
  const [qtyThousands, setQtyThousands] = useState(String(order.qtyOrdered / 1000));
  const [discrepancy, setDiscrepancy] = useState('0');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark delivered</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              qtyDelivered: isStock ? undefined : Math.round(Number(qtyThousands) * 1000),
              qtyDiscrepancy: Number(discrepancy) || 0,
            });
          }}
        >
          {isStock ? (
            <p className="text-sm text-muted-foreground">
              Stock orders deliver the full reserved quantity ({thousands(order.qtyOrdered)} ×1000).
            </p>
          ) : (
            <Field label="Delivered quantity (×1000)" hint="May be less than ordered for partial delivery">
              <Input
                type="number"
                min={0}
                max={order.qtyOrdered / 1000}
                step="0.001"
                value={qtyThousands}
                onChange={(e) => setQtyThousands(e.target.value)}
              />
            </Field>
          )}
          <Field label="Count discrepancy (bricks)" hint="Loaded vs unloaded gap, if any">
            <Input type="number" min={0} value={discrepancy} onChange={(e) => setDiscrepancy(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Confirm delivery'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Row({
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
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={[
          'text-right',
          strong ? 'font-semibold' : '',
          tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : '',
          tone === 'bad' ? 'text-destructive' : '',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}
