'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { formatINR, toPaise } from '@brick/utils';
import { TruckExpenseTypes } from '@brick/types';
import { paymentsApi, ownTrucksApi } from '@/lib/resources';
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

export default function ExpensesPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'OWNER' || role === 'MANAGER' || role === 'ACCOUNTANT';

  const truckExpenses = useQuery({ queryKey: ['truck-expenses'], queryFn: paymentsApi.listTruckExpenses });
  const generalExpenses = useQuery({ queryKey: ['general-expenses'], queryFn: paymentsApi.listGeneralExpenses });
  const ownTrucks = useQuery({ queryKey: ['own-trucks', 'all'], queryFn: () => ownTrucksApi.list({ limit: 200 }) });

  const [truckOpen, setTruckOpen] = useState(false);
  const [generalOpen, setGeneralOpen] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['truck-expenses'] });
    qc.invalidateQueries({ queryKey: ['general-expenses'] });
    qc.invalidateQueries({ queryKey: ['finance'] });
  };

  const [te, setTe] = useState({ ownTruckId: '', expenseType: 'FUEL', amount: '', date: new Date().toISOString().slice(0, 10), description: '' });
  const [ge, setGe] = useState({ category: '', amount: '', date: new Date().toISOString().slice(0, 10), description: '' });

  const createTruck = useMutation({
    mutationFn: () =>
      paymentsApi.createTruckExpense({
        ownTruckId: te.ownTruckId,
        expenseType: te.expenseType,
        amountPaise: toPaise(Number(te.amount)),
        expenseDate: new Date(te.date).toISOString(),
        description: te.description || undefined,
      }),
    onSuccess: () => {
      refresh();
      setTruckOpen(false);
    },
  });
  const createGeneral = useMutation({
    mutationFn: () =>
      paymentsApi.createGeneralExpense({
        category: ge.category,
        amountPaise: toPaise(Number(ge.amount)),
        expenseDate: new Date(ge.date).toISOString(),
        description: ge.description || undefined,
      }),
    onSuccess: () => {
      refresh();
      setGeneralOpen(false);
    },
  });
  const removeTruck = useMutation({
    mutationFn: (id: string) => paymentsApi.removeTruckExpense(id),
    onSuccess: refresh,
  });
  const removeGeneral = useMutation({
    mutationFn: (id: string) => paymentsApi.removeGeneralExpense(id),
    onSuccess: refresh,
  });

  const teError = createTruck.error instanceof ApiError ? createTruck.error.message : null;
  const geError = createGeneral.error instanceof ApiError ? createGeneral.error.message : null;

  return (
    <div className="space-y-8">
      <PageHeader title="Expenses" subtitle="Truck and general business expenses" />

      {/* Truck expenses */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium">Truck expenses</h2>
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                createTruck.reset();
                setTe({ ownTruckId: ownTrucks.data?.data[0]?.id ?? '', expenseType: 'FUEL', amount: '', date: new Date().toISOString().slice(0, 10), description: '' });
                setTruckOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          )}
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Truck</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {truckExpenses.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No truck expenses.</TableCell>
                </TableRow>
              )}
              {truckExpenses.data?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.expenseDate).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>{e.ownTruck?.number ?? '—'}</TableCell>
                  <TableCell><Badge variant="muted">{e.expenseType}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{formatINR(e.amountPaise)}</TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <Button variant="ghost" size="icon" onClick={() => removeTruck.mutate(e.id)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* General expenses */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium">General expenses</h2>
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                createGeneral.reset();
                setGe({ category: '', amount: '', date: new Date().toISOString().slice(0, 10), description: '' });
                setGeneralOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          )}
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generalExpenses.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No general expenses.</TableCell>
                </TableRow>
              )}
              {generalExpenses.data?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.expenseDate).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell className="text-muted-foreground">{e.description ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium">{formatINR(e.amountPaise)}</TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <Button variant="ghost" size="icon" onClick={() => removeGeneral.mutate(e.id)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Truck expense dialog */}
      <Dialog open={truckOpen} onOpenChange={setTruckOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Truck expense</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); createTruck.mutate(); }}>
            <Field label="Truck" required>
              <Select value={te.ownTruckId} onChange={(e) => setTe((p) => ({ ...p, ownTruckId: e.target.value }))} required>
                <option value="" disabled>Select truck…</option>
                {ownTrucks.data?.data.map((t) => (
                  <option key={t.id} value={t.id}>{t.number}</option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <Select value={te.expenseType} onChange={(e) => setTe((p) => ({ ...p, expenseType: e.target.value }))}>
                  {TruckExpenseTypes.map((t) => (
                    <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount (₹)" required>
                <Input type="number" min={1} step="0.01" value={te.amount} onChange={(e) => setTe((p) => ({ ...p, amount: e.target.value }))} required />
              </Field>
              <Field label="Date">
                <Input type="date" value={te.date} onChange={(e) => setTe((p) => ({ ...p, date: e.target.value }))} />
              </Field>
              <Field label="Description">
                <Input value={te.description} onChange={(e) => setTe((p) => ({ ...p, description: e.target.value }))} />
              </Field>
            </div>
            {teError && <p className="text-sm text-destructive">{teError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTruckOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createTruck.isPending || !te.ownTruckId || !te.amount}>
                {createTruck.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* General expense dialog */}
      <Dialog open={generalOpen} onOpenChange={setGeneralOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>General expense</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); createGeneral.mutate(); }}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" required>
                <Input value={ge.category} onChange={(e) => setGe((p) => ({ ...p, category: e.target.value }))} placeholder="Rent, salary, office…" required />
              </Field>
              <Field label="Amount (₹)" required>
                <Input type="number" min={1} step="0.01" value={ge.amount} onChange={(e) => setGe((p) => ({ ...p, amount: e.target.value }))} required />
              </Field>
              <Field label="Date">
                <Input type="date" value={ge.date} onChange={(e) => setGe((p) => ({ ...p, date: e.target.value }))} />
              </Field>
              <Field label="Description">
                <Input value={ge.description} onChange={(e) => setGe((p) => ({ ...p, description: e.target.value }))} />
              </Field>
            </div>
            {geError && <p className="text-sm text-destructive">{geError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setGeneralOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createGeneral.isPending || !ge.category || !ge.amount}>
                {createGeneral.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
