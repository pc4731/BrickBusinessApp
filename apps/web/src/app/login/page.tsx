'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { authApi, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLangStore, useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const setSession = useAuthStore((s) => s.setSession);
  const setLang = useLangStore((s) => s.setLang);
  const [email, setEmail] = useState('owner@balajibricks.example');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: (res) => {
      setSession({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken });
      // Seed the UI language from the user's profile preference.
      if (res.user.language) setLang(res.user.language);
      router.replace('/dashboard');
    },
  });

  const errorMessage =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Login failed' : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Brick ERP</CardTitle>
          <CardDescription>{t('login.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? t('login.signingIn') : t('login.signin')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
