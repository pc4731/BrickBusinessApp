'use client';

import { openDB, type IDBPDatabase } from 'idb';
import { create } from 'zustand';
import { api } from './api';

// ── Offline mutation queue for order entry + payment recording ──────────────
// Mutations made while offline are stored in IndexedDB and flushed to the
// server's idempotent /sync endpoint when connectivity returns.

export type SyncEntityType = 'order' | 'customer_payment';

interface QueuedOp {
  clientUuid: string;
  entityType: SyncEntityType;
  payload: Record<string, unknown>;
  clientTimestamp: string;
  deviceId: string;
  createdAt: number;
}

const DB_NAME = 'brick-offline';
const STORE = 'ops';

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(d) {
        d.createObjectStore(STORE, { keyPath: 'clientUuid' });
      },
    });
  }
  return dbPromise;
}

function getDeviceId(): string {
  if (typeof localStorage === 'undefined') return 'server';
  let id = localStorage.getItem('brick-device-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('brick-device-id', id);
  }
  return id;
}

interface OfflineState {
  online: boolean;
  pending: number;
  setOnline: (v: boolean) => void;
  setPending: (n: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: 0,
  setOnline: (online) => set({ online }),
  setPending: (pending) => set({ pending }),
}));

async function refreshCount() {
  const d = await db();
  if (!d) return;
  useOfflineStore.getState().setPending(await d.count(STORE));
}

/** Queue a mutation for later sync. Returns the client-generated id. */
export async function enqueueOp(entityType: SyncEntityType, payload: Record<string, unknown>) {
  const d = await db();
  const op: QueuedOp = {
    clientUuid: crypto.randomUUID(),
    entityType,
    payload,
    clientTimestamp: new Date().toISOString(),
    deviceId: getDeviceId(),
    createdAt: Date.now(),
  };
  if (d) await d.put(STORE, op);
  await refreshCount();
  return op;
}

/** Flush queued mutations to the server. Synced ops are removed; failed remain. */
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  const d = await db();
  if (!d || typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0, failed: 0 };
  const ops: QueuedOp[] = await d.getAll(STORE);
  if (!ops.length) return { synced: 0, failed: 0 };

  const res = await api<{ results: { clientUuid: string; status: 'synced' | 'failed' }[] }>('/sync', {
    method: 'POST',
    body: {
      operations: ops.map((o) => ({
        clientUuid: o.clientUuid,
        entityType: o.entityType,
        operation: 'create',
        payload: o.payload,
        clientTimestamp: o.clientTimestamp,
        deviceId: o.deviceId,
      })),
    },
  });

  let synced = 0;
  let failed = 0;
  for (const r of res.results) {
    if (r.status === 'synced') {
      await d.delete(STORE, r.clientUuid);
      synced++;
    } else {
      failed++;
    }
  }
  await refreshCount();
  return { synced, failed };
}

let initialised = false;
/** Wire online/offline listeners and do an initial flush. Call once on mount. */
export function initOffline() {
  if (initialised || typeof window === 'undefined') return;
  initialised = true;
  const store = useOfflineStore.getState();
  store.setOnline(navigator.onLine);
  void refreshCount();
  if (navigator.onLine) void flushQueue();

  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnline(true);
    void flushQueue();
  });
  window.addEventListener('offline', () => useOfflineStore.getState().setOnline(false));
}
