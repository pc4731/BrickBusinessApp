'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { ownTruckHooks } from '@/lib/hooks';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api';
import type { OwnTruck } from '@/lib/entities';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDelete } from '@/components/confirm-delete';

const dateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN') : '—');

export default function OwnTrucksPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'OWNER' || role === 'MANAGER';

  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OwnTruck | null>(null);
  const [deleting, setDeleting] = useState<OwnTruck | null>(null);

  const list = ownTruckHooks.useList({ page });
  const create = ownTruckHooks.useCreate();
  const update = ownTruckHooks.useUpdate();
  const remove = ownTruckHooks.useRemove();

  const error =
    create.error instanceof ApiError
      ? create.error.message
      : update.error instanceof ApiError
        ? update.error.message
        : null;

  const [form, setForm] = useState({
    number: '',
    model: '',
    capacityBricks: '',
    insuranceExpiry: '',
    permitExpiry: '',
    fitnessExpiry: '',
  });

  function openCreate() {
    setEditing(null);
    create.reset();
    setForm({ number: '', model: '', capacityBricks: '', insuranceExpiry: '', permitExpiry: '', fitnessExpiry: '' });
    setOpen(true);
  }
  function openEdit(t: OwnTruck) {
    setEditing(t);
    update.reset();
    setForm({
      number: t.number,
      model: t.model ?? '',
      capacityBricks: t.capacityBricks ? String(t.capacityBricks) : '',
      insuranceExpiry: dateInput(t.insuranceExpiry),
      permitExpiry: dateInput(t.permitExpiry),
      fitnessExpiry: dateInput(t.fitnessExpiry),
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      number: form.number.trim(),
      model: form.model.trim() || undefined,
      capacityBricks: form.capacityBricks ? Number(form.capacityBricks) : undefined,
      insuranceExpiry: form.insuranceExpiry ? new Date(form.insuranceExpiry).toISOString() : undefined,
      permitExpiry: form.permitExpiry ? new Date(form.permitExpiry).toISOString() : undefined,
      fitnessExpiry: form.fitnessExpiry ? new Date(form.fitnessExpiry).toISOString() : undefined,
    };
    if (editing) update.mutate({ id: editing.id, body }, { onSuccess: () => setOpen(false) });
    else create.mutate(body, { onSuccess: () => setOpen(false) });
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="Own Trucks"
        subtitle="Fleet vehicles and document expiry"
        action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add truck</Button>}
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Insurance</TableHead>
              <TableHead>Permit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No trucks yet.
                </TableCell>
              </TableRow>
            )}
            {list.data?.data.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.number}</TableCell>
                <TableCell>{t.model ?? '—'}</TableCell>
                <TableCell>{t.capacityBricks ? `${t.capacityBricks.toLocaleString('en-IN')} bricks` : '—'}</TableCell>
                <TableCell>{fmtDate(t.insuranceExpiry)}</TableCell>
                <TableCell>{fmtDate(t.permitExpiry)}</TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(t)} aria-label="Delete">
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit truck' : 'New truck'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Truck number" required>
                <Input value={form.number} onChange={set('number')} required />
              </Field>
              <Field label="Model">
                <Input value={form.model} onChange={set('model')} />
              </Field>
              <Field label="Capacity (bricks)">
                <Input type="number" min={0} value={form.capacityBricks} onChange={set('capacityBricks')} />
              </Field>
              <Field label="Insurance expiry">
                <Input type="date" value={form.insuranceExpiry} onChange={set('insuranceExpiry')} />
              </Field>
              <Field label="Permit expiry">
                <Input type="date" value={form.permitExpiry} onChange={set('permitExpiry')} />
              </Field>
              <Field label="Fitness expiry">
                <Input type="date" value={form.fitnessExpiry} onChange={set('fitnessExpiry')} />
              </Field>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Delete truck ${deleting?.number ?? ''}?`}
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
