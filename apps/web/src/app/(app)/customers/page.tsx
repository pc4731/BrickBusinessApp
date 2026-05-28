'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { formatINR } from '@brick/utils';
import { customerHooks } from '@/lib/hooks';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api';
import type { Customer } from '@/lib/entities';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDelete } from '@/components/confirm-delete';
import { CustomerForm, type CustomerFormValues } from './customer-form';

export default function CustomersPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'OWNER' || role === 'MANAGER';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const list = customerHooks.useList({ search: search || undefined, page });
  const create = customerHooks.useCreate();
  const update = customerHooks.useUpdate();
  const remove = customerHooks.useRemove();

  const mutationError =
    create.error instanceof ApiError
      ? create.error.message
      : update.error instanceof ApiError
        ? update.error.message
        : null;

  function openCreate() {
    setEditing(null);
    create.reset();
    setFormOpen(true);
  }
  function openEdit(c: Customer) {
    setEditing(c);
    update.reset();
    setFormOpen(true);
  }

  function handleSubmit(values: CustomerFormValues) {
    if (editing) {
      update.mutate(
        { id: editing.id, body: values },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      create.mutate(values, { onSuccess: () => setFormOpen(false) });
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Buyers, negotiated rates and delivery sites"
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add customer
            </Button>
          )
        }
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
              <TableHead>Credit limit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {list.data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No customers yet.
                </TableCell>
              </TableRow>
            )}
            {list.data?.data.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link href={`/customers/${c.id}`} className="hover:text-primary hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell>{c.creditLimitPaise ? formatINR(c.creditLimitPaise) : '—'}</TableCell>
                <TableCell>
                  {c.isActive ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="muted">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(c)}
                        aria-label="Delete"
                      >
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

      {formOpen && (
        <CustomerForm
          key={editing?.id ?? 'new'}
          open={formOpen}
          onOpenChange={setFormOpen}
          initial={editing ?? undefined}
          pending={create.isPending || update.isPending}
          error={mutationError}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'customer'}?`}
        pending={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }
      />
    </div>
  );
}
