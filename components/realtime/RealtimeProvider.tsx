import React, { useEffect, useRef, useState } from 'react';
import { emit } from '../../lib/eventBus';
import { supabase } from '../../lib/supabase';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Track auth once
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    // cleanup any existing channel when user changes
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (!userId) return;

    const name = `swaps-${userId}`;
    const ch = supabase.channel(name);

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

    ch.subscribe();
    channelRef.current = ch;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  return <>{children}</>;
}
