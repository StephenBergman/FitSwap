import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { emit } from '../../lib/eventBus';
import { supabase } from '../../lib/supabase';
import { useDev } from '../dev/devcontext';

type Ch = ReturnType<typeof supabase.channel>;

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const channelRef = useRef<Ch | null>(null);

  // dev-gated logger
  const { enabled, visible } = useDev();
  const dlog = (...args: any[]) => {
    if (enabled && visible) console.log(...args);
  };

  // --- Track auth (user + token) and keep realtime socket authed ---
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const token = data.session?.access_token ?? null;
      setAccessToken(token);
      supabase.realtime.setAuth(token ?? '');
      dlog('[rt] setAuth token?', !!token, 'userId?', data.session?.user?.id);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const token = session?.access_token ?? null;
      setUserId(session?.user?.id ?? null);
      setAccessToken(token);
      supabase.realtime.setAuth(token ?? '');
    });

    // also set initial userId once (separate from session)
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Make sure channels are joined when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const chans = supabase.getChannels?.() ?? [];
        for (const ch of chans) {
          // @ts-ignore (state is internal)
          if (ch.state !== 'joined') {
            dlog('[rt] rejoin channel', ch.topic);
            ch.subscribe();
          }
        }
      }
    });
    return () => sub.remove();
  }, []);

  // (Re)create the per-user channel once we have *both* userId and a token
  useEffect(() => {
    // cleanup old
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
    if (!userId || !accessToken) return; // wait until token exists on native

    const ch = supabase.channel(`user-events-${userId}`);
    dlog('[rt] create channel for', userId);

    // --- Swaps (either side) ---
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'swaps', filter: `sender_id=eq.${userId}` },
      () => emit('swaps:changed')
    );
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'swaps', filter: `receiver_id=eq.${userId}` },
      () => emit('swaps:changed')
    );

    // --- Profile ---
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
      () => emit('profile:changed')
    );

    // --- Notifications (client-guarded) ---
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      (payload) => {
        const row = (payload.new ?? payload.old) as any;
        if (row?.user_id === userId) {
          dlog('[rt] notif event', payload.eventType, { rowId: row?.id, rowUser: row?.user_id, currentUser: userId });
          emit('notifications:changed');
        }
      }
    );

    // --- Wishlist ---
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'wishlist', filter: `user_id=eq.${userId}` },
      () => emit('wishlist:changed')
    );

    ch.subscribe((status) => {
      // quiet by default; flip on in Dev UI if needed
      dlog('[rt] channel status:', status);
      if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        setTimeout(() => ch.subscribe(), 800);
      }
    });

    channelRef.current = ch;

    return () => {
      try { supabase.removeChannel(ch); } catch {}
      channelRef.current = null;
    };
  }, [userId, accessToken]);

  return <>{children}</>;
}
