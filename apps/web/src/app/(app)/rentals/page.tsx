'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, IndianRupee, CheckCircle2, XCircle } from 'lucide-react';
import { formatINR, toPaise } from '@brick/utils';
import { PaymentModes } from '@brick/types';
import { rentalsApi, ownTrucksApi } from '@/lib/resources';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api';
import type { TruckRental, TruckRentalStatus } from '@/lib/entities';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDelete } from '@/components/confirm-delete';

const MODE_LABEL: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank transfer',
  CHEQUE: 'Cheque',
};

const STATUS_VARIANT: Record<TruckRentalStatus, 'default' | 'success' | 'muted'> = {
  ACTIVE: 'default',
  COMPLETED: 'success',
  CANCELLED: 'muted',
};

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN') : '—');
const today = () => new Date().toISOString().slice(0, 10);

export default function RentalsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'OWNER' || role === 'MANAGER' || role === 'ACCOUNTANT';
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [paying, setPaying] = useState<TruckRental | null>(null);
  const [deleting, setDeleting] = useState<TruckRental | null>(null);

  const list = useQuery({ queryKey: ['truck-rentals', page], queryFn: () => rentalsApi.list({ page }) });
  // Only trucks that are free (not currently lent out) can start a new rental.
  const trucks = useQuery({ queryKey: ['own-trucks', 'all'], queryFn: () => ownTrucksApi.list({ limit: 200 }) });
  const freeTrucks = trucks.data?.data.filter((t) => !t.isRented) ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['truck-rentals'] });
    qc.invalidateQueries({ queryKey: ['own-trucks'] });
  };

  // ── Create rental ──
  const [form, setForm] = useState({
    ownTruckId: '',
    renterName: '',
    renterPhone: '',
    rentAmount: '',
    startDate: today(),
    endDate: '',
    notes: '',
  });
  const create = useMutation({
    mutationFn: () =>
      rentalsApi.create({
        ownTruckId: form.ownTruckId,
        renterName: form.renterName.trim(),
        renterPhone: form.renterPhone.trim() || undefined,
        rentAmountPaise: toPaise(Number(form.rentAmount)),
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
    },
  });

  function openCreate() {
    create.reset();
    setForm({ ownTruckId: '', renterName: '', renterPhone: '', rentAmount: '', startDate: today(), endDate: '', notes: '' });
    setCreateOpen(true);
  }

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TruckRentalStatus }) => rentalsApi.setStatus(id, status),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => rentalsApi.remove(id),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  const createError = create.error instanceof ApiError ? create.error.message : null;
  const statusError = setStatus.error instanceof ApiError ? setStatus.error.message : null;

  return (
    <div>
      <PageHeader
        title="Truck Rentals"
        subtitle="Lend your own trucks out on rent — income is the rent only"
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Lend a truck
            </Button>
          )
        }
      />

      {statusError && <p className="mb-3 text-sm text-destructive">{statusError}</p>}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Truck</TableHead>
              <TableHead>Renter</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Rent</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No rentals yet.
                </TableCell>
              </TableRow>
            )}
            {list.data?.data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.ownTruck?.number ?? '—'}</TableCell>
                <TableCell>
                  {r.renterName}
                  {r.renterPhone && <span className="block text-xs text-muted-foreground">{r.renterPhone}</span>}
                </TableCell>
                <TableCell className="text-sm">
                  {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
                </TableCell>
                <TableCell className="text-right">{formatINR(r.rentAmountPaise)}</TableCell>
                <TableCell className="text-right">
                  {r.pendingPaise > 0 ? (
                    <span className="text-destructive">{formatINR(r.pendingPaise)}</span>
                  ) : (
                    <span className="text-muted-foreground">Paid</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <div className="flex justify-end gap-1">
                      {r.status !== 'CANCELLED' && r.pendingPaise > 0 && (
                        <Button variant="ghost" size="icon" onClick={() => setPaying(r)} aria-label="Record rent">
                          <IndianRupee className="h-4 w-4" />
                        </Button>
                      )}
                      {r.status === 'ACTIVE' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setStatus.mutate({ id: r.id, status: 'COMPLETED' })}
                            aria-label="Mark returned"
                            title="Mark returned / completed"
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </Button>
                          {r.paidPaise === 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setStatus.mutate({ id: r.id, status: 'CANCELLED' })}
                              aria-label="Cancel"
                              title="Cancel rental"
                            >
                              <XCircle className="h-4 w-4 text-amber-600" />
                            </Button>
                          )}
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(r)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {list.data && <Pagination meta={list.data.meta} onPage={setPage} />}

      {/* Create rental */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lend a truck on rent</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <Field label="Truck" required>
              <Select value={form.ownTruckId} onChange={(e) => setForm((s) => ({ ...s, ownTruckId: e.target.value }))} required>
                <option value="">Select a free truck…</option>
                {freeTrucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.number}
                    {t.model ? ` · ${t.model}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Renter name" required>
                <Input value={form.renterName} onChange={(e) => setForm((s) => ({ ...s, renterName: e.target.value }))} required />
              </Field>
              <Field label="Renter phone">
                <Input value={form.renterPhone} onChange={(e) => setForm((s) => ({ ...s, renterPhone: e.target.value }))} />
              </Field>
              <Field label="Rent amount (₹)" required>
                <Input
                  type="number"
                  min={1}
                  step="0.01"
                  value={form.rentAmount}
                  onChange={(e) => setForm((s) => ({ ...s, rentAmount: e.target.value }))}
                  required
                />
              </Field>
              <div />
              <Field label="Start date" required>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))} required />
              </Field>
              <Field label="End date">
                <Input type="date" value={form.endDate} onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))} />
              </Field>
            </div>
            <Field label="Notes">
              <Input value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
            </Field>
            {freeTrucks.length === 0 && (
              <p className="text-sm text-muted-foreground">No free trucks — every truck is already lent out or none exist.</p>
            )}
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Saving…' : 'Lend truck'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <RentPaymentDialog rental={paying} onOpenChange={(v) => !v && setPaying(null)} onSaved={invalidate} />

      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Delete rental for ${deleting?.ownTruck?.number ?? ''}?`}
        description="This reverses the rent income and any recorded rent payments."
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}

function RentPaymentDialog({
  rental,
  onOpenChange,
  onSaved,
}: {
  rental: TruckRental | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('CASH');
  const [date, setDate] = useState(today());
  const [remarks, setRemarks] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      rentalsApi.recordPayment(rental!.id, {
        amountPaise: toPaise(Number(amount)),
        paymentMode: mode,
        paymentDate: new Date(date).toISOString(),
        remarks: remarks || undefined,
      }),
    onSuccess: () => {
      setAmount('');
      setRemarks('');
      onSaved();
      onOpenChange(false);
    },
  });

  const error = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <Dialog open={Boolean(rental)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record rent — {rental?.ownTruck?.number}</DialogTitle>
        </DialogHeader>
        {rental && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <p className="text-sm text-muted-foreground">
              Pending: <span className="font-medium text-foreground">{formatINR(rental.pendingPaise)}</span>
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Amount (₹)" required>
                <Input type="number" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </Field>
              <Field label="Mode" required>
                <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                  {PaymentModes.map((m) => (
                    <option key={m} value={m}>
                      {MODE_LABEL[m] ?? m}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Date" required>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>
              <Field label="Remarks">
                <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </Field>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Record rent'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
