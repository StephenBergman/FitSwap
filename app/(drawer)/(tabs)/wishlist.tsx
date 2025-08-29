// app/(tabs)/wishlist.tsx
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FSButton from '../../../components/buttons/FSButton';
import { useConfirm } from '../../../components/confirm/confirmprovider';
import { useToast } from '../../../components/toast/ToastProvider';
import { emit, on } from '../../../lib/eventBus';
import { pageContent, pageWrap, WEB_MAX_WIDTH } from '../../../lib/layout';
import { supabase } from '../../../lib/supabase';
import { useColors } from '../../../lib/theme';

type Item = {
  id: string;
  title: string;
  image_url: string | null;
  archived_at?: string | null;
};

type WishlistEntry = {
  id: string;
  item_id: string;
  created_at?: string;
  item: Item | null;
};

export default function WishlistScreen() {
  const c = useColors();
  const confirm = useConfirm();
  const toast = useToast();
  const [rows, setRows] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const visibleRows = React.useMemo(
  () => rows.filter(r => r.item && !r.item.archived_at),
  [rows]
);

  const normalize = (data: any[]): WishlistEntry[] =>
    (data ?? []).map((r) => ({
      id: r.id,
      item_id: r.item_id,
      created_at: r.created_at,
      item: Array.isArray(r.item) ? r.item[0] ?? null : r.item ?? null,
    }));

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        return;
      }

      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          id,
          item_id,
          created_at,
          item:items!wishlist_item_id_fkey (
            id,
            title,
            image_url,
            archived_at
          )
        `)
        .eq('user_id', user.id)
        .is('item.archived_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Wishlist fetch error]', error);
        Alert.alert('Error fetching wishlist', error.message);
      } else {
        setRows(normalize(data ?? []));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWishlist();
    setRefreshing(false);
  }, [fetchWishlist]);

  // Debounced refetch helper (no toast)
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => fetchWishlist(), 200);
  }, [fetchWishlist]);

  // Listen for events:
  // - wishlist:changed -> refetch + toast
  // - items:changed    -> quiet refetch (count/availability changes)
  useEffect(() => {
    const onWishlistChanged = () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(async () => {
        await fetchWishlist();
        toast({ message: 'Wishlist updated' });
      }, 200);
    };

    const offWishlist = on('wishlist:changed', onWishlistChanged);
    const offItems = on('items:changed', scheduleRefetch);

    return () => {
      offWishlist();
      offItems();
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [fetchWishlist, scheduleRefetch, toast]);

  const removeFromWishlist = async (id: string) => {
    try {
      const { error } = await supabase.from('wishlist').delete().eq('id', id);
      if (error) throw error;
      setRows((prev) => prev.filter((r) => r.id !== id));
      emit('wishlist:changed'); // triggers refetch + toast above
    } catch (e: any) {
      console.error('[Remove wishlist error]', e);
      Alert.alert('Remove failed', e?.message ?? 'Please try again.');
    }
  };

  const openItem = useCallback(
    async (id: string) => {
      const { data, error } = await supabase
        .from('items')
        .select('id,archived_at')
        .eq('id', id)
        .maybeSingle();

      if (error || !data || data.archived_at) {
        Alert.alert('Item unavailable', 'This item is no longer listed.');
        setRows((prev) => prev.filter((r) => r.item_id !== id));
        return;
      }
      router.push(`/product/${id}`);
    },
    [router]
  );

  const renderItem = ({ item }: { item: WishlistEntry }) => {
    if (!item.item) return null;
    const thumb = item.item.image_url ?? undefined;
    const title = item.item.title ?? 'Wishlist item';

    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.row}>
          <Image
            source={{ uri: thumb || 'https://via.placeholder.com/300x400.png?text=No+Image' }}
            style={styles.thumb}
            resizeMode="contain"
            accessibilityLabel={title}
          />
          <View style={styles.info}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
              {title}
            </Text>

            <View style={styles.actions}>
              <FSButton
                title="View Details"
                variant="secondary"
                size="sm"
                block={false}
                onPress={() => openItem(item.item_id)}
              />
              <FSButton
                title="Remove"
                variant="danger"
                size="sm"
                block={false}
                onPress={async () => {
                  const ok = await confirm({
                    title: 'Remove from wishlist?',
                    message: title,
                    confirmText: 'Remove',
                    cancelText: 'Cancel',
                    destructive: true,
                  });
                  if (ok) await removeFromWishlist(item.id);
                }}
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ----- UI -----
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[pageWrap(WEB_MAX_WIDTH), styles.container]}>
        <Text style={[styles.heading, { color: c.text }]}>Wishlist</Text>

        {loading ? (
          <ActivityIndicator size="large" color={c.text} />
        ) : rows.length === 0 ? (
          <Text style={{ color: c.muted }}>No items in your wishlist yet.</Text>
        ) : (
          <FlatList
            data={visibleRows}
            keyExtractor={(r) => r.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            refreshControl={
              <RefreshControl tintColor={c.text} refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[pageContent(WEB_MAX_WIDTH), { paddingBottom: 16 }]}
          />
        )}
      </View>
    </View>
  );
}

const THUMB_W = 72;

const styles = StyleSheet.create({
  container: { paddingVertical: 20, flex: 1 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },

  card: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  row: { flexDirection: 'row', gap: 12 },
  thumb: {
    width: THUMB_W,
    height: THUMB_W * (4 / 3),
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  info: { flex: 1 },
  title: { fontWeight: 'bold', marginBottom: 8, fontSize: 16 },

  actions: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
