// context/NotificationsContext.tsx
// Provides app-wide notification state, real-time subscription, and helpers.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type NotificationType = "trade_offered" | "trade_accepted" | "trade_declined";

export type AppNotification = {
  id: string;            // notification id from DB
  type: NotificationType;// type of notification
  payload: any;          // includes swap_id, from_user, etc.
  is_read: boolean;      // whether user has viewed it
  created_at: string;    // ISO timestamp
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

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    const uid = await getUserId();
    if (!uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) {
      setNotifications(data as any);
    }
    setLoading(false);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (!error) setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(async () => {
    const uid = await getUserId();
    if (!uid) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", uid)
      .eq("is_read", false);
    if (!error) setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, []);

  useEffect(() => {
    // initial fetch & realtime subscription
    refresh();

    // subscribe to DB changes for this user
    (async () => {
      const uid = await getUserId();
      if (!uid) return;

      const channel = supabase
        .channel(`notifications-user-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
          (payload) => {
            // handle insert/update
            if (payload.eventType === "INSERT") {
              setNotifications(prev => [payload.new as any, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setNotifications(prev => prev.map(n => (n.id === (payload.new as any).id ? (payload.new as any) : n)));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    })();
  }, [refresh]);

  const value = { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh };
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};
