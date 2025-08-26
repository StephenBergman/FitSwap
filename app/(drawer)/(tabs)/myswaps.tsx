// app/(tabs)/myswaps.tsx
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useConfirm } from '../../../components/confirm/confirmprovider';
import { supabase } from '../../../lib/supabase';
import { useColors } from '../../../lib/theme';

type VUserSwap = {
  id: string;
  item_id: string;
  offered_item_id: string | null;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'canceled';
  created_at: string;
  updated_at?: string | null;
  offered_id: string | null;
  offered_title: string | null;
  offered_image_url: string | null;
  requested_id: string;
  requested_title: string | null;
  requested_image_url: string | null;
};

type JoinedSwap = {
  id: string;
  item_id: string;
  offered_item_id: string | null;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  status: any;
  created_at: string;
  offered?: any;
  requested?: any;
};

export default function MySwapsScreen() {
  const c = useColors();
  const confirmDlg = useConfirm(); 
  const [includeSelf, setIncludeSelf] = useState<boolean>(__DEV__);
  const [swaps, setSwaps] = useState<VUserSwap[]>([]);
  const [tab, setTab] = useState<'sent' | 'received'>('received');
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // Get current user once
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
    });
    return () => { mounted = false; };
  }, []);

  // Core fetch 
  const loadSwaps = useCallback(async () => {
    if (!userId) return;

    const { data: vRows, error: vErr } = await supabase
      .from('v_user_swaps')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!vErr && (vRows?.length ?? 0) > 0) {
      setSwaps(vRows as VUserSwap[]);
      return;
    }

    const { data: jRows, error: jErr } = await supabase
      .from('swaps')
      .select(`
        id, item_id, offered_item_id, sender_id, receiver_id, message, status, created_at,
        offered:items!swaps_offered_item_id_fkey ( id, title, image_url ),
        requested:items!swaps_item_id_fkey      ( id, title, image_url )
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!jErr && (jRows?.length ?? 0) > 0) {
      const normalized: VUserSwap[] = (jRows as JoinedSwap[]).map((s) => {
        const off = Array.isArray(s.offered) ? s.offered[0] : s.offered;
        const req = Array.isArray(s.requested) ? s.requested[0] : s.requested;
        return {
          id: s.id,
          item_id: s.item_id,
          offered_item_id: s.offered_item_id ?? null,
          sender_id: s.sender_id,
          receiver_id: s.receiver_id,
          message: s.message ?? null,
          status: s.status as VUserSwap['status'],
          created_at: s.created_at,
          offered_id: off?.id ?? null,
          offered_title: off?.title ?? null,
          offered_image_url: off?.image_url ?? null,
          requested_id: req?.id ?? s.item_id,
          requested_title: req?.title ?? null,
          requested_image_url: req?.image_url ?? null,
        };
      });
      setSwaps(normalized);
      return;
    }

    const { data: sRows, error: sErr } = await supabase
      .from('swaps')
      .select('id,item_id,offered_item_id,sender_id,receiver_id,message,status,created_at')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (sErr || !sRows?.length) {
      setSwaps([]);
      return;
    }

    const ids = Array.from(
      new Set(sRows.flatMap(s => [s.offered_item_id, s.item_id]).filter(Boolean) as string[])
    );
    const { data: items } = await supabase
      .from('items')
      .select('id,title,image_url')
      .in('id', ids);

    const byId = new Map((items ?? []).map(i => [i.id, i]));
    const formatted: VUserSwap[] = sRows.map(s => {
      const off = s.offered_item_id ? byId.get(s.offered_item_id) : null;
      const req = byId.get(s.item_id);
      return {
        id: s.id,
        item_id: s.item_id,
        offered_item_id: s.offered_item_id ?? null,
        sender_id: s.sender_id,
        receiver_id: s.receiver_id,
        message: s.message ?? null,
        status: s.status as VUserSwap['status'],
        created_at: s.created_at,
        offered_id: off?.id ?? null,
        offered_title: off?.title ?? null,
        offered_image_url: off?.image_url ?? null,
        requested_id: req?.id ?? s.item_id,
        requested_title: req?.title ?? null,
        requested_image_url: req?.image_url ?? null,
      };
    });

    setSwaps(formatted);
  }, [userId]);

  // Initial load
  useEffect(() => {
    loadSwaps();
  }, [loadSwaps]);

  // Debounced refetch used by realtime events
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => {
      loadSwaps();
    }, 200);
  }, [loadSwaps]);

  // Realtime: subscribe to swaps where the user is sender OR receiver
  useEffect(() => {
    if (!userId) return;

    const chSent = supabase
      .channel(`swaps-sent-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'swaps', filter: `sender_id=eq.${userId}` },
        scheduleRefetch
      )
      .subscribe();

    const chRecv = supabase
      .channel(`swaps-recv-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'swaps', filter: `receiver_id=eq.${userId}` },
        scheduleRefetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chSent);
      supabase.removeChannel(chRecv);
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [userId, scheduleRefetch]);

  // Sent vs Received
  const { sent, received } = useMemo(() => {
    if (!userId) return { sent: [] as VUserSwap[], received: [] as VUserSwap[] };
    const allSent = swaps.filter(s => s.sender_id === userId);
    const allReceived = swaps.filter(s => s.receiver_id === userId);
    if (includeSelf) return { sent: allSent, received: allReceived };
    return {
      sent: allSent.filter(s => s.receiver_id !== userId),
      received: allReceived.filter(s => s.sender_id !== userId),
    };
  }, [swaps, userId, includeSelf]);

  const filtered = tab === 'sent' ? sent : received;

  // ----- helpers -----
  const patchLocal = useCallback((id: string, status: VUserSwap['status']) => {
    setSwaps(prev => prev.map(s => (s.id === id ? { ...s, status } : s)));
  }, []);
  // ---------------------------------------------

  // ----- action handlers (atomic guards) -----
  const confirmSwap = useCallback(async (row: VUserSwap) => {
    if (!userId) return;
    const ok = await confirmDlg({
      title: 'Confirm trade?',
      message: row.requested_title ?? 'This will accept the trade.',
      confirmText: 'Confirm',
      cancelText: 'Back',
    });
    if (!ok) return;
    patchLocal(row.id, 'accepted');
    try {
      const { error, data } = await supabase
        .from('swaps')
        .update({ status: 'accepted' })
        .eq('id', row.id)
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .select('id')
        .single();
      if (error || !data) throw error ?? new Error('No update returned');
    } catch (e: any) {
      patchLocal(row.id, 'pending');
      Alert.alert('Confirm failed', e?.message ?? 'Please try again.');
    }
  }, [confirmDlg, patchLocal, userId]);

  const denySwap = useCallback(async (row: VUserSwap) => {
    if (!userId) return;
    const ok = await confirmDlg({
      title: 'Deny trade?',
      message: 'This will reject the trade.',
      confirmText: 'Deny',
      cancelText: 'Back',
      destructive: true,
    });
    if (!ok) return;
    patchLocal(row.id, 'declined');
    try {
      const { error, data } = await supabase
        .from('swaps')
        .update({ status: 'declined' })
        .eq('id', row.id)
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .select('id')
        .single();
      if (error || !data) throw error ?? new Error('No update returned');
    } catch (e: any) {
      patchLocal(row.id, 'pending');
      Alert.alert('Deny failed', e?.message ?? 'Please try again.');
    }
  }, [confirmDlg, patchLocal, userId]);

  const cancelSwap = useCallback(async (row: VUserSwap) => {
    if (!userId) return;
    const ok = await confirmDlg({
      title: 'Cancel trade?',
      message: 'This will withdraw your offer.',
      confirmText: 'Cancel offer',
      cancelText: 'Back',
      destructive: true,
    });
    if (!ok) return;
    patchLocal(row.id, 'canceled');
    try {
      const { error, data } = await supabase
        .from('swaps')
        .update({ status: 'canceled' })
        .eq('id', row.id)
        .eq('sender_id', userId)
        .eq('status', 'pending')
        .select('id')
        .single();
      if (error || !data) throw error ?? new Error('No update returned');
    } catch (e: any) {
      patchLocal(row.id, 'pending');
      Alert.alert('Cancel failed', e?.message ?? 'Please try again.');
    }
  }, [confirmDlg, patchLocal, userId]);
  // -------------------------------------------

  const renderItem = ({ item }: { item: VUserSwap }) => {
    const isSent = item.sender_id === userId;
    const isReceiver = item.receiver_id === userId;
    const pending = item.status === 'pending';

    const thumb = isSent ? item.requested_image_url : item.offered_image_url;
    const title = isSent ? item.requested_title ?? 'Requested item' : item.offered_title ?? 'Offered item';
    const label = isSent ? 'Requesting:' : 'They offered:';

    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.row}>
          <Image
            source={{ uri: thumb || 'https://via.placeholder.com/300x400.png?text=No+Image' }}
            style={[styles.thumb, { backgroundColor: c.card }]}
            resizeMode="cover"
          />
          <View style={styles.info}>
            <Text style={[styles.title, { color: c.text }]}>Swap Request</Text>
            <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
            <Text style={[styles.value, { color: c.text }]} numberOfLines={1}>{title}</Text>

            <Text style={[styles.label, { color: c.muted }]}>Status:</Text>
            <Text style={[styles.value, { color: c.text }]}>{item.status}</Text>

            {!!item.message && (
              <>
                <Text style={[styles.label, { color: c.muted }]}>Message:</Text>
                <Text style={[styles.value, { color: c.text }]} numberOfLines={2}>{item.message}</Text>
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 8 }}>
              <TouchableOpacity onPress={() => router.push(`/swaps/${item.id}`)}>
                <Text style={[styles.link, { color: c.tint }]}>View Details</Text>
              </TouchableOpacity>

              {pending && isReceiver && (
                <>
                  <TouchableOpacity onPress={() => confirmSwap(item)}>
                    <Text style={{ color: c.tint, fontWeight: '700' }}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => denySwap(item)}>
                    <Text style={{ color: '#FF3B30', fontWeight: '700' }}>Deny</Text>
                  </TouchableOpacity>
                </>
              )}

              {pending && !isReceiver && (
                <TouchableOpacity onPress={() => cancelSwap(item)}>
                  <Text style={{ color: '#FF3B30', fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.heading, { color: c.text }]}>My Swaps</Text>

      <View style={styles.selfRow}>
        <Text style={[styles.selfLabel, { color: c.muted }]}>Include self-swaps</Text>
        <Switch value={includeSelf} onValueChange={setIncludeSelf} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setTab('received')}
          style={[
            styles.tabBtn,
            { borderColor: c.border, backgroundColor: c.card },
            tab === 'received' && { backgroundColor: c.tint, borderColor: c.tint },
          ]}
        >
          <Text style={[styles.tabText, { color: tab === 'received' ? '#fff' : c.text }]}>
            Received ({received.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab('sent')}
          style={[
            styles.tabBtn,
            { borderColor: c.border, backgroundColor: c.card },
            tab === 'sent' && { backgroundColor: c.tint, borderColor: c.tint },
          ]}
        >
          <Text style={[styles.tabText, { color: tab === 'sent' ? '#fff' : c.text }]}>
            Sent ({sent.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Text style={{ color: c.muted }}>No swaps yet!</Text>}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const THUMB_W = 56;

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },

  selfRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  selfLabel: { color: '#475569' },

  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabText: { fontWeight: '600' },

  card: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  row: { flexDirection: 'row', gap: 12 },
  thumb: {
    width: THUMB_W,
    height: THUMB_W * (4 / 3),
    borderRadius: 8,
  },
  info: { flex: 1 },
  title: { fontWeight: 'bold', marginBottom: 8, fontSize: 16 },
  label: { fontWeight: '600', marginTop: 4 },
  value: { marginBottom: 2 },
  link: { marginTop: 2, fontWeight: '500' },
});
