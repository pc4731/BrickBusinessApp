'use client';

import { useState } from 'react';
import { toPaise, fromPaise } from '@brick/utils';
import type { Customer } from '@/lib/entities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export interface CustomerFormValues {
  name: string;
  phone: string;
  phoneAlt?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  creditLimitPaise?: number;
  notes?: string;
}

export function CustomerForm({
  open,
  onOpenChange,
  initial,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Customer;
  pending?: boolean;
  error?: string | null;
  onSubmit: (values: CustomerFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [phoneAlt, setPhoneAlt] = useState(initial?.phoneAlt ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [gstin, setGstin] = useState(initial?.gstin ?? '');
  const [pan, setPan] = useState(initial?.pan ?? '');
  const [creditLimit, setCreditLimit] = useState(
    initial?.creditLimitPaise ? String(fromPaise(initial.creditLimitPaise)) : '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      phoneAlt: phoneAlt.trim() || undefined,
      email: email.trim() || undefined,
      gstin: gstin.trim() || undefined,
      pan: pan.trim() || undefined,
      creditLimitPaise: creditLimit ? toPaise(Number(creditLimit)) : undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit customer' : 'New customer'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="name" required>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Phone" htmlFor="phone" required>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </Field>
            <Field label="Alt phone" htmlFor="phoneAlt">
              <Input id="phoneAlt" value={phoneAlt} onChange={(e) => setPhoneAlt(e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="GSTIN" htmlFor="gstin">
              <Input id="gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} />
            </Field>
            <Field label="PAN" htmlFor="pan">
              <Input id="pan" value={pan} onChange={(e) => setPan(e.target.value)} />
            </Field>
            <Field label="Credit limit (₹)" htmlFor="credit" hint="Maximum outstanding allowed">
              <Input
                id="credit"
                type="number"
                min={0}
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="notes">
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
