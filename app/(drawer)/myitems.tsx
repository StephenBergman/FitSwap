import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useConfirm } from '../../components/confirm/confirmprovider';
import { emit } from '../../lib/eventBus'; // cross-platform bus
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/theme';

type Item = {
  id: string;
  title: string | null;
  image_url: string | null;
  created_at: string;
  archived_at: string | null; // null = listed, non-null = delisted
};

export default function MyItemsScreen() {
  const c = useColors();
  const confirmDlg = useConfirm();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const sortRows = useCallback((rows: Item[]) => {
    // Active first, then delisted; each group newest first
    return [...rows].sort((a, b) => {
      const aDel = !!a.archived_at;
      const bDel = !!b.archived_at;
      if (aDel !== bDel) return aDel ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setItems([]);
        return;
      }
      const { data, error } = await supabase
        .from('items')
        .select('id,title,image_url,created_at,archived_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(sortRows((data ?? []) as Item[]));
    } catch (e: any) {
      Alert.alert('Load failed', e?.message ?? 'Please try again.');
      setItems([]);
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

  // Realtime keeps your list updated across tabs/devices
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;

      channel = supabase
        .channel('rt-myitems')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${uid}` },
          (payload) => {
            setItems((prev) => {
              if (payload.eventType === 'DELETE') {
                const oldRow = payload.old as { id: string };
                return prev.filter((r) => r.id !== oldRow.id);
              }
              const row = (payload.new as Item) ?? null;
              if (!row) return prev;
              const next = prev.some((r) => r.id === row.id)
                ? prev.map((r) => (r.id === row.id ? { ...r, ...row } : r))
                : [row, ...prev];
              return sortRows(next);
            });
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [sortRows]);

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

      // optimistic
      const nowISO = new Date().toISOString();
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
          .is('archived_at', null) // no-op if already delisted elsewhere
          .select('id')
          .maybeSingle();

        if (error || !data) throw error ?? new Error('Failed to delist');

        // notify other screens (web + native)
        emit('items:changed');
      } catch (e: any) {
        // rollback
        setItems((prev) => prev.map((r) => (r.id === id ? { ...r, archived_at: null } : r)));
        Alert.alert('Could not delist', e?.message ?? 'Please try again.');
      }
    },
    [confirmDlg]
  );

  const renderItem = ({ item }: { item: Item }) => {
    const archived = !!item.archived_at;

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
            resizeMode="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
              {item.title || 'Untitled item'}
            </Text>
            <Text style={{ color: c.muted, fontSize: 12 }}>
              {new Date(item.created_at).toLocaleString()}
            </Text>

            {archived ? (
              <View style={[styles.badge, { borderColor: c.border, backgroundColor: c.bg }]}>
                <Text style={[styles.badgeText, { color: c.muted }]}>
                  Delisted
                  {item.archived_at ? ` • ${new Date(item.archived_at).toLocaleDateString()}` : ''}
                </Text>
              </View>
            ) : (
              <TouchableOpacity onPress={() => delistItem(item.id, item.title)}>
                <Text style={styles.delist}>Delist</Text>
              </TouchableOpacity>
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

  const activeCount = items.reduce((n, i) => n + (i.archived_at ? 0 : 1), 0);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.heading, { color: c.text }]}>
        My Items {activeCount ? `(${activeCount} active)` : ''}
      </Text>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Text style={{ color: c.muted }}>No items yet.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const THUMB_W = 56;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 10, padding: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: THUMB_W, height: THUMB_W * (4 / 3), borderRadius: 8 },
  title: { fontSize: 16, fontWeight: '600' },
  delist: { color: '#FF3B30', fontWeight: '500', marginTop: 6 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
