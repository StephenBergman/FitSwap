// app/(tabs)/myswaps.tsx
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Switch, Text, View } from 'react-native';

import FSButton from '../../../components/buttons/FSButton';
import { StatusPill } from '../../../components/buttons/StatusPill';

import { useConfirm } from '../../../components/confirm/confirmprovider';
import { useToast } from '../../../components/toast/ToastProvider';
import { on } from '../../../lib/eventBus';
import { pageContent, pageWrap, WEB_MAX_WIDTH } from '../../../lib/layout';
import { supabase } from '../../../lib/supabase';
import { radius, spacing, type as tt, useColors } from '../../../lib/theme';

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
  item_id: string | null;
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
  const toast = useToast();
  const [includeSelf, setIncludeSelf] = useState<boolean>(__DEV__);
  const [swaps, setSwaps] = useState<VUserSwap[]>([]);
  const [tab, setTab] = useState<'sent' | 'received'>('received');

  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();

  // Resolve user
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setUserId(data.session?.user?.id ?? null);
        setAuthReady(true);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthReady(true);
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  // Core fetch
  const loadSwaps = useCallback(async () => {
    if (!authReady || !userId) { setSwaps([]); return; }

    
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
          item_id: s.item_id ?? '',
          offered_item_id: s.offered_item_id ?? null,
          sender_id: s.sender_id,
          receiver_id: s.receiver_id,
          message: s.message ?? null,
          status: s.status as VUserSwap['status'],
          created_at: s.created_at,
          offered_id: off?.id ?? null,
          offered_title: off?.title ?? null,
          offered_image_url: off?.image_url ?? null,
          requested_id: req?.id ?? s.item_id ?? '',
          requested_title: req?.title ?? null,
          requested_image_url: req?.image_url ?? null,
        };
      });
      setSwaps(normalized);
      return;
    }

    
    const { data: sRows } = await supabase
      .from('swaps')
      .select('id,item_id,offered_item_id,sender_id,receiver_id,message,status,created_at')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!sRows?.length) { setSwaps([]); return; }

    const ids = Array.from(new Set(
      sRows.flatMap(s => [s.offered_item_id, s.item_id]).filter(Boolean) as string[]
    ));
    const { data: items } = await supabase.from('items').select('id,title,image_url').in('id', ids);
    const byId = new Map((items ?? []).map(i => [i.id, i]));
    const formatted: VUserSwap[] = sRows.map(s => {
      const off = s.offered_item_id ? byId.get(s.offered_item_id) : null;
      const req = s.item_id ? byId.get(s.item_id) : null;
      return {
        id: s.id,
        item_id: s.item_id ?? '',
        offered_item_id: s.offered_item_id ?? null,
        sender_id: s.sender_id,
        receiver_id: s.receiver_id,
        message: s.message ?? null,
        status: s.status as VUserSwap['status'],
        created_at: s.created_at,
        offered_id: off?.id ?? null,
        offered_title: off?.title ?? null,
        offered_image_url: off?.image_url ?? null,
        requested_id: req?.id ?? s.item_id ?? '',
        requested_title: req?.title ?? null,
        requested_image_url: req?.image_url ?? null,
      };
    });
    setSwaps(formatted);
  }, [authReady, userId]);

  // Initial + user change
  useEffect(() => { loadSwaps(); }, [loadSwaps]);

  // Refresh when screen regains focus
  useFocusEffect(useCallback(() => {
    loadSwaps();
    return () => {};
  }, [loadSwaps]));

  // Debounced refetch via realtime events
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => { loadSwaps(); }, 200);
  }, [loadSwaps]);

  useEffect(() => {
    const off = on('swaps:changed', scheduleRefetch);
    return () => {
      off();
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [scheduleRefetch]);

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

  const patchLocal = useCallback((id: string, status: VUserSwap['status']) => {
    setSwaps(prev => prev.map(s => (s.id === id ? { ...s, status } : s)));
  }, []);

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
      toast({ message: 'Swap accepted' });
    } catch (e: any) {
      patchLocal(row.id, 'pending');
      Alert.alert('Confirm failed', e?.message ?? 'Please try again.');
    }
  }, [confirmDlg, patchLocal, userId, toast]);

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
      toast({ message: 'Swap denied' });
    } catch (e: any) {
      patchLocal(row.id, 'pending');
      Alert.alert('Deny failed', e?.message ?? 'Please try again.');
    }
  }, [confirmDlg, patchLocal, userId, toast]);

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

  const renderItem = ({ item }: { item: VUserSwap }) => {
    const isSent = item.sender_id === userId;
    const isReceiver = item.receiver_id === userId;
    const pending = item.status === 'pending';

    // For sent: show your offered item. For received: show the item offered to you.
    const thumb = isSent ? item.offered_image_url : item.requested_image_url;
    const title = isSent ? (item.offered_title ?? 'Offered item') : (item.requested_title ?? 'Requested item');
    const label = isSent ? 'You offered:' : 'Offer for:';

    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.row}>
          <Image
            source={{ uri: thumb || 'https://via.placeholder.com/300x400.png?text=No+Image' }}
            style={[styles.thumb, { backgroundColor: c.card }]}
            resizeMode="contain"
          />
          <View style={styles.info}>
            <Text style={[styles.title, { color: c.text }]}>Swap Request</Text>

            <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
            <Text style={[styles.value, { color: c.text }]} numberOfLines={1}>{title}</Text>

            <View style={{ height: spacing.xs }} />

            <View style={styles.statusRow}>
              <Text style={[styles.label, { color: c.muted, marginRight: 6 }]}>Status:</Text>
            <StatusPill status={item.status} />
            </View>

            {!!item.message && (
              <>
                <View style={{ height: spacing.xs }} />
                <Text style={[styles.label, { color: c.muted }]}>Message</Text>
                <Text style={[styles.value, { color: c.text }]} numberOfLines={2}>{item.message}</Text>
              </>
            )}

            <View style={styles.actionsRow}>
              <FSButton
                title="View Details"
                variant="secondary"
                size="sm"
                block={false}
                onPress={() => router.push(`/swaps/${item.id}`)}
              />

              {pending && isReceiver && (
                <>
                  <FSButton title="Confirm" variant="success" size="sm" block={false} onPress={() => confirmSwap(item)} />
                  <FSButton title="Deny" variant="danger" size="sm" block={false} onPress={() => denySwap(item)} />
                </>
              )}

              {pending && !isReceiver && (
                <FSButton title="Cancel" variant="danger" size="sm" block={false} onPress={() => cancelSwap(item)} />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.outer, { backgroundColor: c.bg }]}>
      <View style={pageWrap(WEB_MAX_WIDTH)}>
        <View style={styles.container}>
          <Text style={[styles.heading, { color: c.text }]}>My Swaps</Text>

          <View style={styles.selfRow}>
            <Text style={[styles.selfLabel, { color: c.muted }]}>Include self-swaps</Text>
            <Switch value={includeSelf} onValueChange={setIncludeSelf} />
          </View>

          <View style={styles.tabs}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={[styles.tabBtn, { borderColor: c.border, backgroundColor: c.card }, tab === 'received' && { backgroundColor: c.tint, borderColor: c.tint }]}>
                <Text style={[styles.tabText, { color: tab === 'received' ? '#fff' : c.text }]} onPress={() => setTab('received')}>
                  Received ({received.length})
                </Text>
              </View>
              <View style={[styles.tabBtn, { borderColor: c.border, backgroundColor: c.card }, tab === 'sent' && { backgroundColor: c.tint, borderColor: c.tint }]}>
                <Text style={[styles.tabText, { color: tab === 'sent' ? '#fff' : c.text }]} onPress={() => setTab('sent')}>
                  Sent ({sent.length})
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <Text style={{ color: c.muted, paddingHorizontal: spacing.lg }}>
            {authReady ? 'No swaps yet!' : 'Loading…'}
          </Text>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[pageContent(WEB_MAX_WIDTH), { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }]}
      />
    </View>
  );
}

const THUMB_W = 56;
const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },

  outer: { flex: 1 },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  heading: { fontSize: tt.title.size, lineHeight: tt.title.lineHeight, fontWeight: tt.title.weight, marginBottom: spacing.sm },

  selfRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  selfLabel: { fontSize: tt.body.size },

  tabs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  tabBtn: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1 },
  tabText: { fontWeight: '700' },

  card: { padding: spacing.md, borderWidth: 1, borderRadius: radius.md },
  row: { flexDirection: 'row', gap: spacing.md },
  thumb: { width: THUMB_W, height: THUMB_W * (4 / 3), borderRadius: radius.md },
  info: { flex: 1 },
  title: { fontWeight: '800', marginBottom: spacing.xs, fontSize: 16 },
  label: { fontWeight: '600', marginTop: spacing.xs, fontSize: tt.cap.size, lineHeight: tt.cap.lineHeight, textTransform: 'uppercase' },
  value: { marginBottom: 2, fontSize: tt.body.size, lineHeight: tt.body.lineHeight },

  actionsRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
});
