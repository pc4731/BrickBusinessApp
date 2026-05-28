'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Language, UserRole } from '@brick/types';
import { usersApi } from '@/lib/resources';
import type { UserRow } from '@/lib/entities';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDelete } from '@/components/confirm-delete';

const ROLE_LABEL: Record<UserRole, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  ACCOUNTANT: 'Accountant',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const myId = useAuthStore((s) => s.user?.id);
  const list = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'MANAGER' as UserRole,
    language: 'EN' as Language,
    password: '',
    isActive: true,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });
  const create = useMutation({
    mutationFn: () =>
      usersApi.create({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        language: form.language,
        password: form.password,
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
  });
  const update = useMutation({
    mutationFn: () =>
      usersApi.update(editing!.id, {
        name: form.name,
        phone: form.phone || undefined,
        role: form.role,
        language: form.language,
        isActive: form.isActive,
        ...(form.password ? { password: form.password } : {}),
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  const error =
    create.error instanceof ApiError
      ? create.error.message
      : update.error instanceof ApiError
        ? update.error.message
        : null;

  function openCreate() {
    setEditing(null);
    create.reset();
    setForm({ name: '', email: '', phone: '', role: 'MANAGER', language: 'EN', password: '', isActive: true });
    setOpen(true);
  }
  function openEdit(u: UserRow) {
    setEditing(u);
    update.reset();
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone ?? '',
      role: u.role,
      language: u.language,
      password: '',
      isActive: u.isActive,
    });
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Staff accounts and roles"
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add user</Button>}
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
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
            {list.data?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.name}
                  {u.id === myId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ROLE_LABEL[u.role]}</Badge>
                </TableCell>
                <TableCell>
                  {u.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {u.id !== myId && (
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(u)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit user' : 'New user'}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              editing ? update.mutate() : create.mutate();
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" required>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
              </Field>
              <Field label="Email" required>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  disabled={Boolean(editing)}
                  required
                />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </Field>
              <Field label="Role" required>
                <Select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}>
                  <option value="OWNER">Owner</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ACCOUNTANT">Accountant</option>
                </Select>
              </Field>
              <Field label="Language">
                <Select
                  value={form.language}
                  onChange={(e) => setForm((p) => ({ ...p, language: e.target.value as Language }))}
                >
                  <option value="EN">English</option>
                  <option value="HI">हिंदी</option>
                  <option value="HINGLISH">Hinglish</option>
                </Select>
              </Field>
              <Field
                label={editing ? 'New password (optional)' : 'Password'}
                required={!editing}
                hint="Minimum 8 characters"
              >
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required={!editing}
                  minLength={8}
                />
              </Field>
            </div>
            {editing && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  disabled={editing.id === myId}
                />
                Active
              </label>
            )}
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
        title={`Delete ${deleting?.name ?? 'user'}?`}
        description="Their sessions will be revoked and the account hidden."
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
