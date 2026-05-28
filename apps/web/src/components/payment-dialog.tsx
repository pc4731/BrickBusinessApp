'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toPaise } from '@brick/utils';
import { PaymentModes, PaymentTypes } from '@brick/types';
import { paymentsApi } from '@/lib/resources';
import { ApiError } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const MODE_LABEL: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank transfer',
  CHEQUE: 'Cheque',
};

export function PaymentDialog({
  kind,
  partyId,
  partyName,
  orderId,
  open,
  onOpenChange,
  onSaved,
}: {
  kind: 'customer' | 'factory';
  partyId: string;
  partyName: string;
  orderId?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('CASH');
  const [type, setType] = useState(orderId ? 'PARTIAL' : 'ADVANCE');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        amountPaise: toPaise(Number(amount)),
        paymentMode: mode,
        paymentType: type,
        paymentDate: new Date(date).toISOString(),
        remarks: remarks || undefined,
        ...(orderId ? { orderId } : {}),
      };
      if (kind === 'customer') {
        return paymentsApi.createCustomerPayment({ ...body, customerId: partyId });
      }
      return paymentsApi.createFactoryPayment({ ...body, factoryId: partyId });
    },
    onSuccess: () => {
      setAmount('');
      setRemarks('');
      onSaved();
      onOpenChange(false);
    },
  });

  const error = mutation.error instanceof ApiError ? mutation.error.message : null;
  const title =
    kind === 'customer'
      ? `Receive payment — ${partyName}`
      : `Pay factory — ${partyName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          {!orderId && (
            <p className="text-sm text-muted-foreground">
              No order selected — this records an unallocated advance.
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (₹)" required>
              <Input
                type="number"
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Mode">
              <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                {PaymentModes.map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABEL[m]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {PaymentTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Remarks">
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !amount}>
              {mutation.isPending ? 'Saving…' : 'Save payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
