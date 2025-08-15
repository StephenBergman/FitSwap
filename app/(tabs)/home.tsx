import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';

/* ---------------- Banner (unchanged) ---------------- */
function HomeBanner({
  onExplore,
  onListItem,
}: {
  onExplore: () => void;
  onListItem: () => void;
}) {
  return (
    <View style={styles.banner}>
      <View style={styles.blobA} />
      <View style={styles.blobB} />

      <View style={styles.bannerInner}>
        <Text style={styles.brand}>FitSwap</Text>
        <Text style={styles.tagline}>
          Trade outfits you love. Zero cost. Zero clutter.
        </Text>

        <View style={styles.ctaRow}>
          <TouchableOpacity style={styles.ctaPrimary} onPress={onExplore} activeOpacity={0.9}>
            <Text style={styles.ctaPrimaryText}>Explore swaps</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ctaGhost} onPress={onListItem} activeOpacity={0.9}>
            <Text style={styles.ctaGhostText}>List an item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.badgesRow}>
          <View style={styles.badge}><Text style={styles.badgeText}>No fees</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>Local & mail-in</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>Sustainable</Text></View>
        </View>
      </View>
    </View>
  );
}

/* ---------------- Home ---------------- */
type ItemRow = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
};

export default function HomeScreen() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  // wishlist lookup map: { [itemId]: true }
  const [wish, setWish] = useState<Record<string, boolean>>({});

  const { width } = useWindowDimensions();
  const router = useRouter();

  /* Load items */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Fetch Items Error]', error.message);
    } else {
      setItems((data ?? []) as ItemRow[]);
    }
    setLoading(false);
  }, []);

  /* Load wishlist map for the logged-in user */
  const fetchWishlistMap = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setWish({});
      return;
    }
    const { data, error } = await supabase
      .from('wishlist')
      .select('item_id')
      .eq('user_id', uid);

    if (error) {
      console.error('[Fetch Wishlist Map Error]', error.message);
      return;
    }
    const map: Record<string, boolean> = {};
    for (const row of data ?? []) {
      map[row.item_id] = true;
    }
    setWish(map);
  }, []);

  useEffect(() => {
    fetchItems();
    fetchWishlistMap();
  }, [fetchItems, fetchWishlistMap]);

  /* Responsive columns for web & mobile */
  const numColumns = useMemo(() => {
    if (Platform.OS === 'web') {
      if (width >= 1400) return 6;
      if (width >= 1200) return 5;
      if (width >= 992)  return 4;
      if (width >= 768)  return 3;
      return 2;
    }
    if (width >= 900) return 4;
    if (width >= 600) return 3;
    return 2;
  }, [width]);

  /* Toggle wishlist with optimistic UI.
     If the 'toggle_wishlist' RPC exists we use it, otherwise we fall back to insert/delete. */
  const toggleWishlist = useCallback(async (itemId: string) => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      // Not logged in — send to login?
      router.push('/auth/login');
      return;
    }

    const prev = !!wish[itemId];
    // optimistic flip
    setWish((m) => ({ ...m, [itemId]: !prev }));

    // 1) Try RPC if you created it
    try {
      const { data, error } = await supabase.rpc('toggle_wishlist', { p_item: itemId });
      if (!error && data !== undefined && data !== null) {
        setWish((m) => ({ ...m, [itemId]: !!data }));
        return;
      }
      // If the RPC isn't present, fall through to fallback
    } catch {
      // ignore and fallback
    }

    // 2) Fallback: insert/delete
    try {
      if (prev) {
        // was in wishlist -> remove
        const { error } = await supabase.from('wishlist')
          .delete()
          .eq('user_id', uid)
          .eq('item_id', itemId);
        if (error) throw error;
      } else {
        // was not in wishlist -> add
        const { error } = await supabase.from('wishlist')
          .insert({ user_id: uid, item_id: itemId });
        if (error) throw error;
      }
    } catch (e) {
      console.error('[Wishlist toggle fallback error]', e);
      // revert optimistic update on error
      setWish((m) => ({ ...m, [itemId]: prev }));
    }
  }, [router, wish]);

  const renderItem = ({ item }: { item: ItemRow }) => {
    const wished = !!wish[item.id];

    return (
      <View style={styles.card}>
        {/* Heart overlay */}
        <TouchableOpacity
          onPress={() => toggleWishlist(item.id)}
          style={styles.heartButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name={wished ? 'heart' : 'heart-outline'}
            size={20}
            color={wished ? '#EF4444' : '#111827'}
          />
        </TouchableOpacity>

        {/* Card body (tap navigates) */}
        <TouchableOpacity
          onPress={() => router.push(`/product/${item.id}`)}
          activeOpacity={0.85}
        >
          <Image
            source={{ uri: item.image_url || 'https://via.placeholder.com/300x300.png?text=No+Image' }}
            style={styles.image}
            resizeMode="contain"
          />
          <View style={styles.cardContent}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.description} numberOfLines={2}>{item.description ?? ''}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <HomeBanner
        onExplore={() => router.push('/home')}
        onListItem={() => router.push('/swap')}
      />

      <FlatList
        key={`grid-${numColumns}`}
        data={items}
        keyExtractor={(item) => String(item.id)}
        numColumns={numColumns}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        columnWrapperStyle={numColumns > 1 ? { gap: 6 } : undefined}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading ? 'Loading…' : 'No items found. Try uploading some!'}
          </Text>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

/* ---------------- Styles  ---------------- */
const styles = StyleSheet.create({
  // --- Banner ---
  banner: {
    position: 'relative',
    backgroundColor: '#FFF4F7',
    borderRadius: 16,
    paddingVertical: 24,
    marginHorizontal: Platform.select({ web: 4, default: 8 }),
    marginBottom: 12,
    overflow: 'hidden',
  },
  bannerInner: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#0F172A',
  },
  tagline: { fontSize: 16, color: '#334155', maxWidth: 680 },
  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  ctaPrimary: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#06B6D4' },
  ctaPrimaryText: { color: '#fff', fontWeight: '700' },
  ctaGhost: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'transparent',
    borderWidth: 1, borderColor: '#06B6D4',
  },
  ctaGhostText: { color: '#06B6D4', fontWeight: '700' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  badge: {
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  badgeText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  blobA: { position: 'absolute', width: 220, height: 220, borderRadius: 999, backgroundColor: '#FDE68A55', top: -60, right: -40 },
  blobB: { position: 'absolute', width: 180, height: 180, borderRadius: 999, backgroundColor: '#5EEAD455', bottom: -50, left: -30 },

  // --- List/Grid ---
  list: { paddingHorizontal: 8, paddingBottom: 100, gap: 6 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 50, fontSize: 16 },

  // --- Cards ---
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: undefined,
    aspectRatio: 3 / 4,
    backgroundColor: '#f0f0f0',
    alignSelf: 'stretch',
  },
  cardContent: {
    width: '100%',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  title: { fontSize: 14, fontWeight: '600', color: '#222' },
  description: { fontSize: 12, color: '#666', marginTop: 4 },

  // --- Heart overlay ---
  heartButton: {
    position: 'absolute',
    zIndex: 2,
    right: 8,
    top: 8,
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
});
