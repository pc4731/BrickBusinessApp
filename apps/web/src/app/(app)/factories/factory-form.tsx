'use client';

import { useState } from 'react';
import { toPaise, fromPaise } from '@brick/utils';
import type { Factory } from '@/lib/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export interface FactoryFormValues {
  name: string;
  ownerName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  creditLimitPaise?: number;
  creditDays?: number;
  notes?: string;
}

export function FactoryForm({
  open,
  onOpenChange,
  initial,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Factory;
  pending?: boolean;
  error?: string | null;
  onSubmit: (values: FactoryFormValues) => void;
}) {
  const [v, setV] = useState({
    name: initial?.name ?? '',
    ownerName: initial?.ownerName ?? '',
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    pincode: initial?.pincode ?? '',
    gstin: initial?.gstin ?? '',
    creditLimit: initial?.creditLimitPaise ? String(fromPaise(initial.creditLimitPaise)) : '',
    creditDays: initial?.creditDays ? String(initial.creditDays) : '',
    notes: initial?.notes ?? '',
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: v.name.trim(),
      ownerName: v.ownerName.trim() || undefined,
      phone: v.phone.trim() || undefined,
      address: v.address.trim() || undefined,
      city: v.city.trim() || undefined,
      state: v.state.trim() || undefined,
      pincode: v.pincode.trim() || undefined,
      gstin: v.gstin.trim() || undefined,
      creditLimitPaise: v.creditLimit ? toPaise(Number(v.creditLimit)) : undefined,
      creditDays: v.creditDays ? Number(v.creditDays) : undefined,
      notes: v.notes.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit factory' : 'New factory / bhatta'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <Input value={v.name} onChange={set('name')} required />
            </Field>
            <Field label="Owner name">
              <Input value={v.ownerName} onChange={set('ownerName')} />
            </Field>
            <Field label="Phone">
              <Input value={v.phone} onChange={set('phone')} />
            </Field>
            <Field label="GSTIN">
              <Input value={v.gstin} onChange={set('gstin')} />
            </Field>
            <Field label="City">
              <Input value={v.city} onChange={set('city')} />
            </Field>
            <Field label="State">
              <Input value={v.state} onChange={set('state')} />
            </Field>
            <Field label="Credit limit (₹)">
              <Input type="number" min={0} value={v.creditLimit} onChange={set('creditLimit')} />
            </Field>
            <Field label="Credit days" hint="Days of credit the factory allows">
              <Input type="number" min={0} value={v.creditDays} onChange={set('creditDays')} />
            </Field>
          </div>
          <Field label="Address">
            <Textarea value={v.address} onChange={set('address')} />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
