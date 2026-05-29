'use client';

import Link from 'next/link';
import { Users2, Factory, Truck, IdCard, Settings, UserCog, ClipboardList, Boxes, Wallet, Receipt } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useT } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TILES = [
  { href: '/orders', labelKey: 'nav.orders', icon: ClipboardList, descKey: 'tile.orders' },
  { href: '/stock', labelKey: 'nav.stock', icon: Boxes, descKey: 'tile.stock' },
  { href: '/finance', labelKey: 'nav.finance', icon: Wallet, descKey: 'tile.finance' },
  { href: '/expenses', labelKey: 'nav.expenses', icon: Receipt, descKey: 'tile.expenses' },
  { href: '/customers', labelKey: 'nav.customers', icon: Users2, descKey: 'tile.customers' },
  { href: '/factories', labelKey: 'nav.factories', icon: Factory, descKey: 'tile.factories' },
  { href: '/trucks', labelKey: 'nav.trucks', icon: Truck, descKey: 'tile.trucks' },
  { href: '/drivers', labelKey: 'nav.drivers', icon: IdCard, descKey: 'tile.drivers' },
  { href: '/users', labelKey: 'nav.users', icon: UserCog, descKey: 'tile.users', owner: true },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings, descKey: 'tile.settings', owner: true },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const t = useT();
  const tiles = TILES.filter((tile) => !tile.owner || user?.role === 'OWNER');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t('dashboard.welcome')}
          {user ? `, ${user.name}` : ''}
        </h1>
        <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link key={tile.href} href={tile.href}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <Icon className="h-6 w-6 text-primary" />
                  <CardTitle className="text-lg">{t(tile.labelKey)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{t(tile.descKey)}</CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
