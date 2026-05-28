'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { hiredTruckHooks } from '@/lib/hooks';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api';
import type { HiredTruck } from '@/lib/entities';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDelete } from '@/components/confirm-delete';

export default function HiredTrucksPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'OWNER' || role === 'MANAGER';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HiredTruck | null>(null);
  const [deleting, setDeleting] = useState<HiredTruck | null>(null);

  const list = hiredTruckHooks.useList({ search: search || undefined, page });
  const create = hiredTruckHooks.useCreate();
  const update = hiredTruckHooks.useUpdate();
  const remove = hiredTruckHooks.useRemove();

  const error =
    create.error instanceof ApiError
      ? create.error.message
      : update.error instanceof ApiError
        ? update.error.message
        : null;

  const [form, setForm] = useState({ number: '', ownerName: '', ownerPhone: '', driverName: '', driverPhone: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  function openCreate() {
    setEditing(null);
    create.reset();
    setForm({ number: '', ownerName: '', ownerPhone: '', driverName: '', driverPhone: '' });
    setOpen(true);
  }
  function openEdit(t: HiredTruck) {
    setEditing(t);
    update.reset();
    setForm({
      number: t.number,
      ownerName: t.ownerName ?? '',
      ownerPhone: t.ownerPhone ?? '',
      driverName: t.driverName ?? '',
      driverPhone: t.driverPhone ?? '',
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      number: form.number.trim(),
      ownerName: form.ownerName.trim() || undefined,
      ownerPhone: form.ownerPhone.trim() || undefined,
      driverName: form.driverName.trim() || undefined,
      driverPhone: form.driverPhone.trim() || undefined,
    };
    if (editing) update.mutate({ id: editing.id, body }, { onSuccess: () => setOpen(false) });
    else create.mutate(body, { onSuccess: () => setOpen(false) });
  }

  return (
    <div>
      <PageHeader
        title="Hired Trucks"
        subtitle="Third-party transporters"
        action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add hired truck</Button>}
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
        <Input
          className="pl-9"
          placeholder="Search number or owner…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Owner phone</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No hired trucks yet.
                </TableCell>
              </TableRow>
            )}
            {list.data?.data.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.number}</TableCell>
                <TableCell>{t.ownerName ?? '—'}</TableCell>
                <TableCell>{t.ownerPhone ?? '—'}</TableCell>
                <TableCell>{t.driverName ?? '—'}</TableCell>
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
            <DialogTitle>{editing ? 'Edit hired truck' : 'New hired truck'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Truck number" required>
                <Input value={form.number} onChange={set('number')} required />
              </Field>
              <Field label="Owner name">
                <Input value={form.ownerName} onChange={set('ownerName')} />
              </Field>
              <Field label="Owner phone">
                <Input value={form.ownerPhone} onChange={set('ownerPhone')} />
              </Field>
              <Field label="Driver name">
                <Input value={form.driverName} onChange={set('driverName')} />
              </Field>
              <Field label="Driver phone">
                <Input value={form.driverPhone} onChange={set('driverPhone')} />
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
