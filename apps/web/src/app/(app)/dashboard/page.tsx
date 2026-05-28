'use client';

import Link from 'next/link';
import { Users2, Factory, Truck, IdCard, Settings, UserCog, ClipboardList, Boxes } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TILES = [
  { href: '/orders', label: 'Orders', icon: ClipboardList, desc: 'Create & track deliveries' },
  { href: '/stock', label: 'Stock', icon: Boxes, desc: 'Yard inventory & batches' },
  { href: '/customers', label: 'Customers', icon: Users2, desc: 'Manage buyers, rates, sites' },
  { href: '/factories', label: 'Factories', icon: Factory, desc: 'Bhattas & purchase rates' },
  { href: '/trucks', label: 'Own Trucks', icon: Truck, desc: 'Fleet & document expiry' },
  { href: '/drivers', label: 'Drivers', icon: IdCard, desc: 'Driver directory' },
  { href: '/users', label: 'Users', icon: UserCog, desc: 'Staff & roles', owner: true },
  { href: '/settings', label: 'Settings', icon: Settings, desc: 'Business & GST config', owner: true },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const tiles = TILES.filter((t) => !t.owner || user?.role === 'OWNER');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome{user ? `, ${user.name}` : ''}</h1>
        <p className="text-muted-foreground">Master data is ready. Orders & finance come next.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <Icon className="h-6 w-6 text-primary" />
                  <CardTitle className="text-lg">{t.label}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{t.desc}</CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
