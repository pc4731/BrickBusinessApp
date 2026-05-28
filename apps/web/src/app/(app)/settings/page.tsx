'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toPaise, fromPaise } from '@brick/utils';
import type { BrickLossPolicy, Language } from '@brick/types';
import { settingsApi } from '@/lib/resources';
import type { OrgSettingsResponse } from '@/lib/entities';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const isOwner = useAuthStore((s) => s.user?.role) === 'OWNER';
  const query = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  return (
    <div>
      <PageHeader title="Settings" subtitle="Business details, GST and operational defaults" />
      {query.isLoading && <p className="text-muted-foreground">Loading…</p>}
      {query.data && <SettingsForm key={query.data.id} initial={query.data} readOnly={!isOwner} />}
    </div>
  );
}

function SettingsForm({ initial, readOnly }: { initial: OrgSettingsResponse; readOnly: boolean }) {
  const qc = useQueryClient();
  const s = initial.settings;

  const [biz, setBiz] = useState({
    name: initial.name ?? '',
    legalName: initial.legalName ?? '',
    phone: initial.phone ?? '',
    email: initial.email ?? '',
    gstin: initial.gstin ?? '',
    pan: initial.pan ?? '',
    address: initial.address ?? '',
    city: initial.city ?? '',
    state: initial.state ?? '',
    pincode: initial.pincode ?? '',
  });
  const [cfg, setCfg] = useState({
    gstEnabled: s.gstEnabled,
    gstPercent: String(s.defaultGstRate / 100),
    lowStock: String(s.lowStockThresholdBricks),
    lossPolicy: s.brickLossPolicy as BrickLossPolicy,
    prefix: s.orderNumberPrefix,
    language: s.defaultLanguage as Language,
    truckCostType: s.ownTruckCostModel.type,
    truckCostAmount:
      s.ownTruckCostModel.type === 'PER_TRIP'
        ? String(fromPaise(s.ownTruckCostModel.amountPaise))
        : s.ownTruckCostModel.type === 'PER_BRICK'
          ? String(fromPaise(s.ownTruckCostModel.paisePerBrick))
          : '',
  });

  const setBizField = (k: keyof typeof biz) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBiz((p) => ({ ...p, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const ownTruckCostModel =
        cfg.truckCostType === 'PER_TRIP'
          ? { type: 'PER_TRIP' as const, amountPaise: toPaise(Number(cfg.truckCostAmount || 0)) }
          : cfg.truckCostType === 'PER_BRICK'
            ? { type: 'PER_BRICK' as const, paisePerBrick: toPaise(Number(cfg.truckCostAmount || 0)) }
            : { type: 'NONE' as const };
      return settingsApi.update({
        ...biz,
        settings: {
          gstEnabled: cfg.gstEnabled,
          defaultGstRate: Math.round(Number(cfg.gstPercent) * 100),
          lowStockThresholdBricks: Number(cfg.lowStock),
          brickLossPolicy: cfg.lossPolicy,
          orderNumberPrefix: cfg.prefix,
          defaultLanguage: cfg.language,
          ownTruckCostModel,
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const error = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Business name" required>
            <Input value={biz.name} onChange={setBizField('name')} disabled={readOnly} required />
          </Field>
          <Field label="Legal name">
            <Input value={biz.legalName} onChange={setBizField('legalName')} disabled={readOnly} />
          </Field>
          <Field label="Phone">
            <Input value={biz.phone} onChange={setBizField('phone')} disabled={readOnly} />
          </Field>
          <Field label="Email">
            <Input value={biz.email} onChange={setBizField('email')} disabled={readOnly} />
          </Field>
          <Field label="GSTIN">
            <Input value={biz.gstin} onChange={setBizField('gstin')} disabled={readOnly} />
          </Field>
          <Field label="PAN">
            <Input value={biz.pan} onChange={setBizField('pan')} disabled={readOnly} />
          </Field>
          <Field label="City">
            <Input value={biz.city} onChange={setBizField('city')} disabled={readOnly} />
          </Field>
          <Field label="State">
            <Input value={biz.state} onChange={setBizField('state')} disabled={readOnly} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Operational defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="GST enabled" hint="Toggle GST invoicing for the business">
            <Select
              value={cfg.gstEnabled ? 'yes' : 'no'}
              onChange={(e) => setCfg((p) => ({ ...p, gstEnabled: e.target.value === 'yes' }))}
              disabled={readOnly}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </Field>
          <Field label="Default GST rate (%)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={cfg.gstPercent}
              onChange={(e) => setCfg((p) => ({ ...p, gstPercent: e.target.value }))}
              disabled={readOnly}
            />
          </Field>
          <Field label="Low stock alert (bricks)">
            <Input
              type="number"
              min={0}
              value={cfg.lowStock}
              onChange={(e) => setCfg((p) => ({ ...p, lowStock: e.target.value }))}
              disabled={readOnly}
            />
          </Field>
          <Field label="Brick loss policy" hint="Who bears load/unload count gaps">
            <Select
              value={cfg.lossPolicy}
              onChange={(e) => setCfg((p) => ({ ...p, lossPolicy: e.target.value as BrickLossPolicy }))}
              disabled={readOnly}
            >
              <option value="SELLER_BEARS">Seller bears</option>
              <option value="BUYER_BEARS">Buyer bears</option>
              <option value="SPLIT">Split</option>
            </Select>
          </Field>
          <Field label="Order number prefix">
            <Input
              value={cfg.prefix}
              onChange={(e) => setCfg((p) => ({ ...p, prefix: e.target.value }))}
              disabled={readOnly}
            />
          </Field>
          <Field label="Default language">
            <Select
              value={cfg.language}
              onChange={(e) => setCfg((p) => ({ ...p, language: e.target.value as Language }))}
              disabled={readOnly}
            >
              <option value="EN">English</option>
              <option value="HI">हिंदी</option>
              <option value="HINGLISH">Hinglish</option>
            </Select>
          </Field>
          <Field label="Own truck cost model" hint="How own-truck cost is merged into order costing">
            <Select
              value={cfg.truckCostType}
              onChange={(e) =>
                setCfg((p) => ({ ...p, truckCostType: e.target.value as typeof p.truckCostType }))
              }
              disabled={readOnly}
            >
              <option value="NONE">None</option>
              <option value="PER_TRIP">Per trip (₹)</option>
              <option value="PER_BRICK">Per brick (₹)</option>
            </Select>
          </Field>
          {cfg.truckCostType !== 'NONE' && (
            <Field label={cfg.truckCostType === 'PER_TRIP' ? 'Cost per trip (₹)' : 'Cost per brick (₹)'}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={cfg.truckCostAmount}
                onChange={(e) => setCfg((p) => ({ ...p, truckCostAmount: e.target.value }))}
                disabled={readOnly}
              />
            </Field>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!readOnly && (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save settings'}
          </Button>
          {mutation.isSuccess && <span className="text-sm text-emerald-600">Saved ✓</span>}
        </div>
      )}
      {readOnly && <p className="text-sm text-muted-foreground">Only the owner can edit settings.</p>}
    </form>
  );
}
