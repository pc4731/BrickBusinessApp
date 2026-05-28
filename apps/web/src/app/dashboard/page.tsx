'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken, refreshToken, clear } = useAuthStore();

  useEffect(() => {
    if (!accessToken) router.replace('/login');
  }, [accessToken, router]);

  async function handleLogout() {
    if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
    clear();
    router.replace('/login');
  }

  if (!accessToken) return null;

  // Phase 0 shell. Real dashboard widgets land in Phase 4.
  const tiles = ['Orders', 'Customers', 'Factories', 'Stock', 'Payments', 'Reports'];

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Brick ERP</h1>
          <p className="text-sm text-muted-foreground">
            {user ? `${user.name} · ${user.role}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container py-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {tiles.map((t) => (
            <Card key={t} className="transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle className="text-xl">{t}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Coming soon</CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
