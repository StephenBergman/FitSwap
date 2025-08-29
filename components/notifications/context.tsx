// components/notifications/context.tsx
// App-wide notification state + helpers.
// - Initial/explicit sync via `refresh()`
// - Live updates via: RealtimeProvider -> eventBus('notifications:changed')
// - PLUS a direct Supabase realtime channel scoped to this user
// - Mobile-safe, self-scheduling poll (paused in background) to backstop RN timer quirks

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useDev } from '../../components/dev/devcontext';
import { on } from '../../lib/eventBus';
import { supabase } from '../../lib/supabase';

type NotificationType = 'trade_offered' | 'trade_accepted' | 'trade_declined';

export type AppNotification = {
  id: string;
  type: NotificationType;
  payload: any;          // jsonb or a stringified JSON blob
  is_read: boolean;
  created_at: string;    // ISO
};

type Ctx = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<Ctx>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refresh: async () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

// ---------- helpers ----------
function coercePayload(p: unknown) {
  if (p == null) return null;
  if (typeof p === 'string') {
    try {
      return JSON.parse(p);
    } catch {
      return p;
    }
  }
  return p;
}

function normalizeRow(row: any): AppNotification {
  return {
    id: row.id,
    type: row.type,
    payload: coercePayload(row.payload),
    is_read: !!row.is_read,
    created_at: row.created_at,
  };
}

function mergeDedupSortLimit(
  prev: AppNotification[],
  incoming: AppNotification[],
  limit = 50
) {
  const map = new Map<string, AppNotification>();
  for (const n of prev) map.set(n.id, n);
  for (const n of incoming) map.set(n.id, n); // incoming overwrites on same id
  return Array.from(map.values())
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);
}

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // dev-gated logger
  const { enabled, visible } = useDev();
  const dlog = (...args: any[]) => {
    if (enabled && visible) console.log(...args);
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );
  useEffect(() => {
    dlog('[notif] unreadCount =', unreadCount);
  }, [unreadCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve current user and keep in sync with auth state
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Immediately clear local state on logout (don’t wait for refresh)
  useEffect(() => {
    if (!userId) setNotifications([]);
  }, [userId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!userId) {
        setNotifications([]);
        return;
      }
      dlog('[notif refresh:start] userId=', userId);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      dlog('[notif refresh:done] rows=', data?.length ?? 0, 'error=', error?.message);

      if (!error && data) {
        const normalized = (data as any[]).map(normalizeRow);
        setNotifications((prev) => mergeDedupSortLimit(prev, normalized));
      }
    } finally {
      setLoading(false);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update; a subsequent refresh (or realtime) will reconcile
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) {
      // Roll back on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
    }
    dlog('[notif] markAsRead sent for', id, 'error?', !!error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) refresh(); // fallback to full sync if bulk fails
  }, [userId, refresh]);

  // Initial sync & whenever the user changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen to the app event bus (emitted by RealtimeProvider)
  // Immediate refresh + short retry to dodge replica lag
  useEffect(() => {
    return on('notifications:changed', async () => {
      await refresh();
      setTimeout(() => {
        dlog('[notif bus] retry refresh after 900ms');
        refresh();
      }, 900);
    });
  }, [refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // Direct realtime subscription scoped to this user (extra safety on native)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`rt:notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as any;
          if (!row) return;

          dlog('[notif rt] event', payload.eventType, 'rowId', row?.id);

          const n = normalizeRow(row);
          setNotifications((prev) => {
            switch (payload.eventType) {
              case 'INSERT':
              case 'UPDATE':
                return mergeDedupSortLimit(prev, [n]);
              case 'DELETE':
                return prev.filter((x) => x.id !== n.id);
              default:
                return prev;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mobile-safe background-paused polling loop (self-scheduling setTimeout).
  // Works on Android/iOS where setInterval can be throttled.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    // Track app foreground/background
    const appState = { current: AppState.currentState as AppStateStatus };
    const sub = AppState.addEventListener('change', (next) => {
      appState.current = next;
    });

    const tick = async () => {
      if (cancelled) return;
      if (appState.current === 'active') {
        await refresh();
      }
      const delay = Platform.OS === 'web' ? 12000 : 20000;
      timeout = setTimeout(tick, delay);
    };

    // first follow-up shortly after mount
    timeout = setTimeout(tick, 8000);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      sub.remove();
    };
  }, [userId, refresh]);  

  const value: Ctx = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};
