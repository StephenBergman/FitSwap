// app/(tabs)/myitems.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FSButton from '../../components/buttons/FSButton';
import { StatusPill } from '../../components/buttons/StatusPill';
import { useConfirm } from '../../components/confirm/confirmprovider';
import { emit, on } from '../../lib/eventBus';
import { pageContent, pageWrap, WEB_MAX_WIDTH } from '../../lib/layout';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/theme';

type Item = {
  id: string;
  title: string | null;
  image_url: string | null;
  created_at: string;
  archived_at: string | null; // null = listed, non-null = delisted
};

type Section = { title: 'Pending' | 'Active' | 'Archived'; data: Item[] };

export default function MyItemsScreen() {
  const c = useColors();
  const confirmDlg = useConfirm();

  const [items, setItems] = useState<Item[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const sortRows = useCallback((rows: Item[]) => {
    // Active first, then delisted; newest first within each
    return [...rows].sort((a, b) => {
      const aDel = !!a.archived_at;
      const bDel = !!b.archived_at;
      if (aDel !== bDel) return aDel ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, []);

  // Fetch items + compute which ones are "pending" in swaps (incoming or outgoing)
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setItems([]);
        setPendingIds(new Set());
        return;
      }

      const { data, error } = await supabase
        .from('items')
        .select('id,title,image_url,created_at,archived_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as Item[];
      setItems(sortRows(rows));

      const ids = rows.map((r) => r.id);
      if (!ids.length) {
        setPendingIds(new Set());
      } else {
        const [incoming, outgoing] = await Promise.all([
          supabase.from('swaps').select('id,item_id,status').in('item_id', ids).eq('status', 'pending'),
          supabase.from('swaps').select('id,offered_item_id,status').in('offered_item_id', ids).eq('status', 'pending'),
        ]);
        const next = new Set<string>();
        (incoming.data ?? []).forEach((s: any) => s.item_id && next.add(s.item_id));
        (outgoing.data ?? []).forEach((s: any) => s.offered_item_id && next.add(s.offered_item_id));
        setPendingIds(next);
      }
    } catch (e: any) {
      Alert.alert('Load failed', e?.message ?? 'Please try again.');
      setItems([]);
      setPendingIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [sortRows]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Debounced bus-driven refetch (items and swaps influence this page)
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => load(), 200);
  }, [load]);

  useEffect(() => {
    const offItems = on('items:changed', scheduleRefetch);
    const offSwaps = on('swaps:changed', scheduleRefetch);
    return () => {
      offItems();
      offSwaps();
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [scheduleRefetch]);

  // ---- Actions (with proper optimistic rollback) ----
  const delistItem = useCallback(
    async (id: string, title: string | null) => {
      const ok = await confirmDlg({
        title: 'Delist item?',
        message: title ?? 'This will hide the item from the feed.',
        confirmText: 'Delist',
        cancelText: 'Cancel',
        destructive: true,
      });
      if (!ok) return;

      const prevArchived = items.find((r) => r.id === id)?.archived_at ?? null;
      const nowISO = new Date().toISOString();

      // optimistic
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, archived_at: nowISO } : r)));

      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) throw new Error('Not signed in');

        const { error, data } = await supabase
          .from('items')
          .update({ archived_at: nowISO })
          .eq('id', id)
          .eq('user_id', uid)
          .is('archived_at', null)
          .select('id')
          .maybeSingle();

        if (error || !data) throw error ?? new Error('Failed to delist');

        emit('items:changed'); // notify other screens
      } catch (e: any) {
        // rollback
        setItems((prev) => prev.map((r) => (r.id === id ? { ...r, archived_at: prevArchived } : r)));
        Alert.alert('Could not delist', e?.message ?? 'Please try again.');
      }
    },
    [confirmDlg, items]
  );

  const relistItem = useCallback(
    async (id: string, title: string | null) => {
      const ok = await confirmDlg({
        title: 'Relist item?',
        message: title ?? 'This will make the item visible again.',
        confirmText: 'Relist',
        cancelText: 'Cancel',
      });
      if (!ok) return;

      const prevArchived = items.find((r) => r.id === id)?.archived_at ?? null;

      // optimistic
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, archived_at: null } : r)));

      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) throw new Error('Not signed in');

        const { error, data } = await supabase
          .from('items')
          .update({ archived_at: null })
          .eq('id', id)
          .eq('user_id', uid)
          .not('archived_at', 'is', null)
          .select('id')
          .maybeSingle();

        if (error || !data) throw error ?? new Error('Failed to relist');

        emit('items:changed');
      } catch (e: any) {
        // rollback
        setItems((prev) => prev.map((r) => (r.id === id ? { ...r, archived_at: prevArchived } : r)));
        Alert.alert('Could not relist', e?.message ?? 'Please try again.');
      }
    },
    [confirmDlg, items]
  );

  const renderRow = ({ item }: { item: Item }) => {
    const archived = !!item.archived_at;
    const pending = pendingIds.has(item.id);

    return (
      <View
        style={[
          styles.card,
          { borderColor: c.border, backgroundColor: c.card, opacity: archived ? 0.6 : 1 },
        ]}
      >
        <View style={styles.row}>
          <Image
            source={{ uri: item.image_url || 'https://via.placeholder.com/300x400.png?text=No+Image' }}
            style={[styles.thumb, { backgroundColor: '#eee' }]}
            resizeMode="contain"
            accessibilityLabel={item.title || 'Listed item'}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
              {item.title || 'Untitled item'}
            </Text>
            <Text style={{ color: c.muted, fontSize: 12 }}>
              {new Date(item.created_at).toLocaleString()}
            </Text>

            {pending && !archived && (
              <StatusPill
                status="pending"
                label="Pending offers"
                style={{ marginTop: 6 }}
              />
            )}

            {archived && (
              <StatusPill
                status="canceled"
                label={`Delisted${item.archived_at ? ` • ${new Date(item.archived_at).toLocaleDateString()}` : ''}`}
                style={{ marginTop: 6 }}
              />
            )}

            {!archived ? (
              <FSButton
                title="Delist"
                variant="danger"
                size="sm"
                block={false}
                onPress={() => delistItem(item.id, item.title)}
                style={{ alignSelf: 'flex-start', marginTop: 6 }}
              />
            ) : (
              <FSButton
                title="Relist"
                variant="primary"
                size="sm"
                block={false}
                onPress={() => relistItem(item.id, item.title)}
                style={{ alignSelf: 'flex-start', marginTop: 6 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.tint} />
      </View>
    );
  }

  // Sections: Pending (active & pending), Active (active & not pending), Archived
  const pendingSection = items.filter((i) => !i.archived_at && pendingIds.has(i.id));
  const activeSection = items.filter((i) => !i.archived_at && !pendingIds.has(i.id));
  const archivedSection = items.filter((i) => !!i.archived_at);

  const sections: Section[] = [
    pendingSection.length ? { title: 'Pending', data: pendingSection } : null,
    activeSection.length ? { title: 'Active', data: activeSection } : null,
    archivedSection.length ? { title: 'Archived', data: archivedSection } : null,
  ].filter(Boolean) as Section[];

  const activeCount = activeSection.length;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[pageWrap(WEB_MAX_WIDTH), styles.container]}>
        <Text style={[styles.heading, { color: c.text }]}>
          My Items {activeCount ? `(${activeCount} active)` : ''}
        </Text>

        <SectionList
          sections={sections}
          keyExtractor={(it) => it.id}
          renderItem={renderRow}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionHeader, { color: c.muted }]}>{section.title}</Text>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<Text style={{ color: c.muted }}>No items yet.</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.text} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[pageContent(WEB_MAX_WIDTH), { paddingBottom: 16 }]}
        />
      </View>
    </View>
  );
}

const THUMB_W = 56;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 10 },

  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },

  card: { borderWidth: 1, borderRadius: 10, padding: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: THUMB_W, height: THUMB_W * (4 / 3), borderRadius: 8 },
  title: { fontSize: 16, fontWeight: '600' },
});
