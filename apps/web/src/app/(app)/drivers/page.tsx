'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { driverHooks } from '@/lib/hooks';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api';
import type { Driver } from '@/lib/entities';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDelete } from '@/components/confirm-delete';

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN') : '—');

export default function DriversPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'OWNER' || role === 'MANAGER';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [deleting, setDeleting] = useState<Driver | null>(null);

  const list = driverHooks.useList({ search: search || undefined, page });
  const create = driverHooks.useCreate();
  const update = driverHooks.useUpdate();
  const remove = driverHooks.useRemove();

  const error =
    create.error instanceof ApiError
      ? create.error.message
      : update.error instanceof ApiError
        ? update.error.message
        : null;

  const [form, setForm] = useState({ name: '', phone: '', licenseNumber: '', licenseExpiry: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  function openCreate() {
    setEditing(null);
    create.reset();
    setForm({ name: '', phone: '', licenseNumber: '', licenseExpiry: '' });
    setOpen(true);
  }
  function openEdit(d: Driver) {
    setEditing(d);
    update.reset();
    setForm({
      name: d.name,
      phone: d.phone ?? '',
      licenseNumber: d.licenseNumber ?? '',
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.slice(0, 10) : '',
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      licenseNumber: form.licenseNumber.trim() || undefined,
      licenseExpiry: form.licenseExpiry ? new Date(form.licenseExpiry).toISOString() : undefined,
    };
    if (editing) update.mutate({ id: editing.id, body }, { onSuccess: () => setOpen(false) });
    else create.mutate(body, { onSuccess: () => setOpen(false) });
  }

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Driver directory and licence tracking"
        action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add driver</Button>}
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
        <Input
          className="pl-9"
          placeholder="Search name or phone…"
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
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Licence</TableHead>
              <TableHead>Licence expiry</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No drivers yet.
                </TableCell>
              </TableRow>
            )}
            {list.data?.data.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{d.phone ?? '—'}</TableCell>
                <TableCell>{d.licenseNumber ?? '—'}</TableCell>
                <TableCell>{fmtDate(d.licenseExpiry)}</TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(d)} aria-label="Delete">
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
            <DialogTitle>{editing ? 'Edit driver' : 'New driver'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" required>
                <Input value={form.name} onChange={set('name')} required />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={set('phone')} />
              </Field>
              <Field label="Licence number">
                <Input value={form.licenseNumber} onChange={set('licenseNumber')} />
              </Field>
              <Field label="Licence expiry">
                <Input type="date" value={form.licenseExpiry} onChange={set('licenseExpiry')} />
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
        title={`Delete ${deleting?.name ?? 'driver'}?`}
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
