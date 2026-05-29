'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, RefreshCw, Check, AlertTriangle, IndianRupee, Package } from 'lucide-react';
import { notificationsApi } from '@/lib/resources';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  LOW_STOCK: Package,
  CUSTOMER_PAYMENT_DUE: IndianRupee,
  FACTORY_DUE_OVERDUE: AlertTriangle,
};

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const unread = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 60_000,
  });
  const list = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: notificationsApi.list,
    enabled: open,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };
  const refresh = useMutation({ mutationFn: notificationsApi.refresh, onSuccess: invalidate });
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: invalidate });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: invalidate });

  const count = unread.data?.count ?? 0;

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => setOpen((o) => !o)}>
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-lg border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="font-medium">Alerts</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Refresh alerts"
                  onClick={() => refresh.mutate()}
                  disabled={refresh.isPending}
                >
                  <RefreshCw className={cn('h-4 w-4', refresh.isPending && 'animate-spin')} />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Mark all read" onClick={() => markAll.mutate()}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {list.isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
              {list.data?.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No alerts. You&apos;re all caught up.</p>
              )}
              {list.data?.map((n) => {
                const Icon = ICON[n.type] ?? Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => !n.isRead && markRead.mutate(n.id)}
                    className={cn(
                      'flex w-full gap-3 border-b px-3 py-2.5 text-left last:border-0 hover:bg-accent',
                      !n.isRead && 'bg-primary/5',
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{n.title}</span>
                      <span className="block text-xs text-muted-foreground">{n.body}</span>
                    </span>
                    {!n.isRead && <span className="ml-auto mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
