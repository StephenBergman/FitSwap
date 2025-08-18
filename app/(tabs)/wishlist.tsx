// app/(tabs)/wishlist.tsx
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/theme';

type Item = {
  id: string;
  title: string;
  image_url: string | null;
};

type WishlistEntry = {
  id: string;
  item_id: string;
  created_at?: string;
  item: Item | null; // normalized to a single object (or null)
};

export default function WishlistScreen() {
  const c = useColors();
  const [rows, setRows] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

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
        setLoading(false);
        Alert.alert('Error', 'User not logged in');
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
            image_url
          )
        `)
        .eq('user_id', user.id)
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

  useEffect(() => {
  let channel: ReturnType<typeof supabase.channel> | null = null;

  (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    channel = supabase
      .channel('rt-wishlist-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wishlist', filter: `user_id=eq.${user.id}` },
        () => fetchWishlist() // refresh the rows
      )
      .subscribe();
  })();

  return () => {
    if (channel) supabase.removeChannel(channel);
  };
}, [fetchWishlist]);

  const removeFromWishlist = async (id: string) => {
    try {
      const { error } = await supabase.from('wishlist').delete().eq('id', id);
      if (error) throw error;
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      console.error('[Remove wishlist error]', e);
      Alert.alert('Remove failed', e.message ?? 'Please try again.');
    }
    DeviceEventEmitter.emit('wishlist:changed');
  };

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
            resizeMode="cover"
          />
          <View style={styles.info}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
              {title}
            </Text>

            <Text style={[styles.label, { color: c.muted }]}>Title:</Text>
            <Text style={[styles.value, { color: c.text }]} numberOfLines={2}>
              {title}
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/product/[ProductId]',
                    params: { ProductId: item.item_id },
                  })
                }
              >
                <Text style={[styles.link, { color: c.tint }]}>View Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Remove from wishlist?', title, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () => removeFromWishlist(item.id),
                    },
                  ])
                }
              >
                <Text style={styles.remove}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.heading, { color: c.text }]}>Wishlist</Text>

      {loading ? (
        <ActivityIndicator size="large" color={c.text} />
      ) : rows.length === 0 ? (
        <Text style={{ color: c.muted }}>No items in your wishlist yet.</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={
            <RefreshControl tintColor={c.text} refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const THUMB_W = 72;

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },

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
    backgroundColor: '#eee',
  },
  info: { flex: 1 },
  title: { fontWeight: 'bold', marginBottom: 6, fontSize: 16 },
  label: { fontWeight: '600', marginTop: 2 },
  value: { marginBottom: 2 },

  actions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  link: { fontWeight: '500' },
  remove: { color: '#FF3B30', fontWeight: '500' },
});
