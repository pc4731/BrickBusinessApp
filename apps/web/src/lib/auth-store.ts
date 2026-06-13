'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@brick/types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  // True once the persisted session has been rehydrated from storage.
  // Guards against redirecting to /login before localStorage is read on refresh.
  hasHydrated: boolean;
  setSession: (s: { user: AuthUser; accessToken: string; refreshToken: string }) => void;
  setTokens: (t: { accessToken: string; refreshToken: string }) => void;
  setHasHydrated: (v: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hasHydrated: false,
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'brick-auth',
      // Only persist the session itself — never the transient hydration flag.
      partialize: ({ user, accessToken, refreshToken }) => ({ user, accessToken, refreshToken }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
