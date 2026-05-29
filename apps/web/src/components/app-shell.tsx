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
} from 'lucide-react';
import type { UserRole } from '@brick/types';
import { useAuthStore } from '@/lib/auth-store';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/notification-bell';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[]; // undefined = all roles
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/stock', label: 'Stock', icon: Boxes },
  { href: '/finance', label: 'Finance', icon: Wallet },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/customers', label: 'Customers', icon: Users2 },
  { href: '/factories', label: 'Factories', icon: Factory },
  { href: '/trucks', label: 'Own Trucks', icon: Truck },
  { href: '/hired-trucks', label: 'Hired Trucks', icon: TruckIcon },
  { href: '/drivers', label: 'Drivers', icon: IdCard },
  { href: '/users', label: 'Users', icon: UserCog, roles: ['OWNER'] },
  { href: '/audit', label: 'Audit Log', icon: ScrollText, roles: ['OWNER'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['OWNER'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken, refreshToken, clear } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!accessToken) router.replace('/login');
  }, [accessToken, router]);

  // Close the mobile drawer on navigation.
  useEffect(() => setMobileOpen(false), [pathname]);

  if (!accessToken) return null;

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
            {item.label}
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
            <NotificationBell />
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
