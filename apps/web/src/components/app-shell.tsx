'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users2,
  Factory,
  Truck,
  TruckIcon,
  Handshake,
  UserCog,
  Settings,
  Menu,
  X,
  IdCard,
  ClipboardList,
  Boxes,
  Wallet,
  Receipt,
  BarChart3,
  ScrollText,
  WifiOff,
} from 'lucide-react';
import type { UserRole } from '@brick/types';
import { useAuthStore } from '@/lib/auth-store';
import { useOfflineStore } from '@/lib/offline';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/notification-bell';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useT } from '@/lib/i18n';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[]; // undefined = all roles
}

const NAV: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/orders', labelKey: 'nav.orders', icon: ClipboardList },
  { href: '/stock', labelKey: 'nav.stock', icon: Boxes },
  { href: '/finance', labelKey: 'nav.finance', icon: Wallet },
  { href: '/reports', labelKey: 'nav.reports', icon: BarChart3 },
  { href: '/expenses', labelKey: 'nav.expenses', icon: Receipt },
  { href: '/customers', labelKey: 'nav.customers', icon: Users2 },
  { href: '/factories', labelKey: 'nav.factories', icon: Factory },
  { href: '/trucks', labelKey: 'nav.trucks', icon: Truck },
  { href: '/hired-trucks', labelKey: 'nav.hiredTrucks', icon: TruckIcon },
  { href: '/rentals', labelKey: 'nav.rentals', icon: Handshake },
  { href: '/drivers', labelKey: 'nav.drivers', icon: IdCard },
  { href: '/users', labelKey: 'nav.users', icon: UserCog, roles: ['OWNER'] },
  { href: '/audit', labelKey: 'nav.audit', icon: ScrollText, roles: ['OWNER'] },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings, roles: ['OWNER'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const { user, accessToken, refreshToken, hasHydrated, clear } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Wait for the persisted session to rehydrate before deciding to redirect,
    // otherwise a page refresh bounces to /login before localStorage is read.
    if (hasHydrated && !accessToken) router.replace('/login');
  }, [hasHydrated, accessToken, router]);

  // Close the mobile drawer on navigation.
  useEffect(() => setMobileOpen(false), [pathname]);

  if (!hasHydrated || !accessToken) return null;

  const role = user?.role;
  const items = NAV.filter((i) => !i.roles || (role && i.roles.includes(role)));

  async function handleLogout() {
    if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
    clear();
    router.replace('/login');
  }

  const navList = (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r bg-card lg:flex lg:flex-col">
        <div className="flex h-14 items-center border-b px-4 font-semibold">🧱 Brick ERP</div>
        <div className="flex-1 overflow-y-auto">{navList}</div>
        <div className="border-t p-3 text-xs text-muted-foreground">
          {user?.name} · {role}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-card shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4 font-semibold">
              🧱 Brick ERP
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">{navList}</div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-semibold lg:hidden">Brick ERP</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NotificationBell />
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              {t('common.logout')}
            </Button>
          </div>
        </header>
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function OfflineBanner() {
  const online = useOfflineStore((s) => s.online);
  const pending = useOfflineStore((s) => s.pending);
  if (online && pending === 0) return null;
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-1.5 text-sm',
        online ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-destructive/15 text-destructive',
      )}
    >
      {online ? (
        <>
          <WifiOff className="h-4 w-4" /> {pending} change{pending === 1 ? '' : 's'} pending sync…
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" /> Offline — orders & payments will be saved and synced when you reconnect.
          {pending > 0 && ` (${pending} pending)`}
        </>
      )}
    </div>
  );
}
