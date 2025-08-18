// app/swaps/[Id].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/theme';

type ItemLite = {
  id: string;
  title: string | null;
  image_url: string | null;
  trade_for?: string | null;
};

type SwapRow = {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'canceled';
  message: string | null;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  item_id: string;
  offered_item_id: string | null;
  item: ItemLite | null;
  offered_item: ItemLite | null;
};

export default function SwapDetailScreen() {
  const { Id } = useLocalSearchParams<{ Id?: string }>();
  const router = useRouter();
  const c = useColors();

  const [swap, setSwap] = useState<SwapRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // DEV list when there is no Id or the record is missing
  const [devLoading, setDevLoading] = useState(false);
  const [devRecent, setDevRecent] = useState<SwapRow[]>([]);

  const fetchSwap = useCallback(
    async (overrideId?: string) => {
      const wantedId = overrideId ?? Id; 
      if (!wantedId || Array.isArray(wantedId)) {
        setSwap(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('swaps')
        .select(`
          id, status, message, sender_id, receiver_id, created_at, item_id, offered_item_id,
          item:item_id ( id, title, image_url, trade_for ),
          offered_item:offered_item_id ( id, title, image_url )
        `)
        .eq('id', wantedId)
        .maybeSingle();

      if (error) {
        console.error('[swap details]', error);
        Alert.alert('Error', 'Failed to load swap details.');
        setSwap(null);
      } else {
        setSwap((data as unknown as SwapRow) ?? null);
      }
      setLoading(false);
    },
    [Id]
  );

  useEffect(() => {
    fetchSwap();
  }, [fetchSwap]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSwap();
    setRefreshing(false);
  }, [fetchSwap]);

  const devLoadRecent = useCallback(async () => {
    setDevLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        Alert.alert('Not logged in', 'Sign in to load your swaps.');
        setDevRecent([]);
        return;
      }

      const { data, error } = await supabase
        .from('swaps')
        .select(`
          id, status, message, sender_id, receiver_id, created_at, item_id, offered_item_id,
          item:item_id ( id, title, image_url, trade_for ),
          offered_item:offered_item_id ( id, title, image_url )
        `)
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;
      setDevRecent((data ?? []) as unknown as SwapRow[]);
    } catch (e) {
      console.error('[devLoadRecent]', e);
      setDevRecent([]);
    } finally {
      setDevLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.tint} />
      </View>
    );
  }

  if (!swap) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <Text style={[styles.title, { color: c.text }]}>No swap details found.</Text>

        {__DEV__ && (
          <View style={[styles.devBox, { borderColor: c.border, backgroundColor: c.card }]}>
            <Text style={[styles.devTitle, { color: c.text }]}>DEV: Load a recent swap</Text>

            <TouchableOpacity
              style={[styles.devBtn, { backgroundColor: c.tint }]}
              onPress={devLoadRecent}
              disabled={devLoading}
              activeOpacity={0.9}
            >
              <Text style={styles.devBtnText}>{devLoading ? 'Loading…' : 'Fetch recent'}</Text>
            </TouchableOpacity>

            <FlatList
              data={devRecent}
              keyExtractor={(row) => row.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item: row }) => (
                <TouchableOpacity
                  style={[styles.devRow, { borderColor: c.border, backgroundColor: c.card }]}
                  onPress={() => router.replace(`/swaps/${row.id}`)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: '600' }}>
                      {row.item?.title ?? 'Requested item'}
                    </Text>
                    <Text style={{ color: c.muted, fontSize: 12 }}>
                      {row.status} • {new Date(row.created_at).toLocaleString()}
                    </Text>
                  </View>
                  {!!row.item?.image_url && (
                    <Image
                      source={{ uri: row.item.image_url }}
                      style={styles.devThumb}
                      resizeMode="cover"
                    />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !devLoading ? (
                  <Text style={{ color: c.muted, marginTop: 8 }}>
                    No recent swaps. Try creating one from a product.
                  </Text>
                ) : null
              }
            />
          </View>
        )}
      </View>
    );
  }

  const req = swap.item;
  const off = swap.offered_item;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.scrollPad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.title, { color: c.text }]}>Swap Request</Text>
      <Text style={{ color: c.muted, marginBottom: 6 }}>
        Status: <Text style={{ color: c.text }}>{swap.status}</Text>
      </Text>
      {!!swap.message && (
        <Text style={{ color: c.text, marginBottom: 16 }}>Message: {swap.message}</Text>
      )}

      <Text style={[styles.section, { color: c.text }]}>Requested item</Text>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        {!!req?.image_url && (
          <Image source={{ uri: req.image_url }} style={styles.image} resizeMode="contain" />
        )}
        <Text style={[styles.cardTitle, { color: c.text }]}>{req?.title ?? 'Item'}</Text>
        {!!req?.trade_for && (
          <Text style={{ color: c.muted, marginTop: 2 }}>
            Looking for: <Text style={{ color: c.text }}>{req.trade_for}</Text>
          </Text>
        )}
      </View>

      <Text style={[styles.section, { color: c.text }]}>Offered item</Text>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        {!!off?.image_url ? (
          <Image source={{ uri: off.image_url }} style={styles.image} resizeMode="contain" />
        ) : (
          <Text style={{ color: c.muted }}>No item attached yet.</Text>
        )}
        {!!off?.title && <Text style={[styles.cardTitle, { color: c.text }]}>{off.title}</Text>}
      </View>
    </ScrollView>
  );
}

const IMG_H = 180;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollPad: { padding: 16 },

  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  section: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },

  card: { borderWidth: 1, borderRadius: 10, padding: 12 },
  image: {
    width: '100%',
    height: IMG_H,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },

  // DEV bits
  devBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12 },
  devTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  devBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  devBtnText: { color: '#fff', fontWeight: '700' },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  devThumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: '#eee' },
});
