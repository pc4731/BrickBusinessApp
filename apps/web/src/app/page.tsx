'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function Home() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    // Don't route until the persisted session is rehydrated, so a refresh on
    // "/" doesn't send a logged-in user to /login.
    if (!hasHydrated) return;
    router.replace(accessToken ? '/dashboard' : '/login');
  }, [hasHydrated, accessToken, router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-muted-foreground">
      Loading…
    </main>
  );
}
