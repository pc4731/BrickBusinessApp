'use client';

import type { AuthTokens, AuthUser } from '@brick/types';
import { useAuthStore } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean; // default true
}

async function rawRequest<T>(path: string, options: RequestOptions, token: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (options.auth !== false && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => ({}))) as T & { message?: string | string[] };
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new ApiError(res.status, msg ?? res.statusText);
  }
  return data as T;
}

/** Tries the request; on 401 rotates the refresh token once and retries. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { accessToken, refreshToken, setTokens, clear } = useAuthStore.getState();

  try {
    return await rawRequest<T>(path, options, accessToken);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401 || options.auth === false || !refreshToken) {
      throw err;
    }
    // Attempt a single refresh + retry.
    try {
      const tokens = await rawRequest<AuthTokens>(
        '/auth/refresh',
        { method: 'POST', body: { refreshToken }, auth: false },
        null,
      );
      setTokens(tokens);
      return await rawRequest<T>(path, options, tokens.accessToken);
    } catch {
      clear();
      throw err;
    }
  }
}

// ── Typed auth helpers ──
export const authApi = {
  login: (email: string, password: string) =>
    api<AuthTokens & { user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),
  logout: (refreshToken: string) =>
    api<void>('/auth/logout', { method: 'POST', body: { refreshToken } }),
  me: () => api<AuthUser>('/auth/me'),
};
