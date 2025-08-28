// app/(drawer)/(tabs)/home.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FSButton from '../../../components/buttons/FSButton';
import FSInput from '../../../components/buttons/FSInput';
import { emit, on } from '../../../lib/eventBus';
import { pageContent, pageWrap, WEB_MAX_WIDTH } from '../../../lib/layout';
import { supabase } from '../../../lib/supabase';
import { useColors } from '../../../lib/theme';

/* ---------------- Banner ---------------- */
function HomeBanner({
  onExplore,
  onListItem,
}: {
  onExplore: () => void;
  onListItem: () => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.banner, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.blobA, { backgroundColor: 'rgba(253,230,138,0.25)' }]} />
      <View style={[styles.blobB, { backgroundColor: 'rgba(94,234,212,0.22)' }]} />

      <View style={styles.bannerInner}>
        <Text style={[styles.brand, { color: c.text }]}>FitSwap</Text>
        <Text style={[styles.tagline, { color: c.muted }]}>
          Trade for outfits you love. Zero cost. Zero clutter.
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          <View style={{ flexGrow: 0, minWidth: 140 }}>
            <FSButton title="Explore swaps" onPress={onExplore} />
          </View>
          <View style={{ flexGrow: 0, minWidth: 130 }}>
            <FSButton title="List an item" variant="secondary" onPress={onListItem} />
          </View>
        </View>

        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Text style={[styles.badgeText, { color: c.muted }]}>No fees</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Text style={[styles.badgeText, { color: c.muted }]}>Local & mail-in</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Text style={[styles.badgeText, { color: c.muted }]}>Sustainable</Text>
          </View>
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
  archived_at?: string | null;
};

export default function HomeScreen() {
  const c = useColors();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [onlyWishlisted, setOnlyWishlisted] = useState(false);
  const [withImagesOnly, setWithImagesOnly] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(id);
  }, [query]);

  const [wish, setWish] = useState<Record<string, boolean>>({});
  const { width } = useWindowDimensions();
  const router = useRouter();

  // Load items (exclude delisted)
  const fetchItems = useCallback(async () => {
    setLoading(true);

    let q = supabase
      .from('items')
      .select('id,title,description,image_url,archived_at')
      .is('archived_at', null);

    if (debouncedQuery) {
      const like = `%${debouncedQuery}%`;
      q = q.or(`title.ilike.${like},description.ilike.${like}`);
    }

    const ascending = sort === 'oldest';
    q = q.order('created_at', { ascending }).order('id', { ascending: false });

    const { data, error } = await q.limit(100);
    if (error) {
      console.error('[Fetch items error]', error.message);
    } else {
      setItems((data ?? []) as ItemRow[]);
    }
    setLoading(false);
  }, [debouncedQuery, sort]);

  const displayItems = useMemo(() => {
    let arr = items;
    if (onlyWishlisted) arr = arr.filter((it) => wish[it.id]);
    if (withImagesOnly) arr = arr.filter((it) => (it.image_url ?? '').trim());
    return arr;
  }, [items, wish, onlyWishlisted, withImagesOnly]);

  // Load wishlist map for the logged-in user
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
    for (const row of data ?? []) map[row.item_id] = true;
    setWish(map);
  }, []);

  // React to wishlist changes elsewhere
  useEffect(() => {
    const off = on('wishlist:changed', fetchWishlistMap);
    return off;
  }, [fetchWishlistMap]);

  // Initial load
  useEffect(() => {
    fetchItems();
    fetchWishlistMap();
  }, [fetchItems, fetchWishlistMap]);

  // Realtime: handled via centralized provider -> event bus
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => fetchItems(), 200);
  }, [fetchItems]);

  // Refetch when other parts of the app signal item changes
  useEffect(() => {
    const off = on('items:changed', scheduleRefetch);
    return () => {
      off();
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [scheduleRefetch]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchItems(), fetchWishlistMap()]);
    setRefreshing(false);
  }, [fetchItems, fetchWishlistMap]);

  // Responsive columns
  const numColumns = useMemo(() => {
    if (Platform.OS === 'web') {
      if (width >= 1400) return 6;
      if (width >= 1200) return 5;
      if (width >= 992) return 4;
      if (width >= 768) return 3;
      return 2;
    }
    if (width >= 900) return 4;
    if (width >= 600) return 3;
    return 2;
  }, [width]);

  // Toggle wishlist with optimistic UI
  const toggleWishlist = useCallback(
    async (itemId: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        router.push('/auth/login');
        emit('wishlist:changed');
        return;
      }

      const prev = !!wish[itemId];
      setWish((m) => ({ ...m, [itemId]: !prev }));

      try {
        const { data, error } = await supabase.rpc('toggle_wishlist', { p_item: itemId });
        if (!error && data !== undefined && data !== null) {
          setWish((m) => ({ ...m, [itemId]: !!data }));
          emit('wishlist:changed');
          return;
        }
      } catch {
        // ignore and fallback below
      }

      try {
        if (prev) {
          const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('user_id', uid)
            .eq('item_id', itemId);
          if (error) throw error;
          emit('wishlist:changed');
        } else {
          const { error } = await supabase.from('wishlist').insert({ user_id: uid, item_id: itemId });
          if (error) throw error;
          emit('wishlist:changed'); 
        }
      } catch (e) {
        console.error('[Wishlist toggle fallback error]', e);
        setWish((m) => ({ ...m, [itemId]: prev }));
      }
    },
    [router, wish]
  );

  // Safe open: verify availability just before navigation
  const openItem = useCallback(
    async (id: string) => {
      const { data, error } = await supabase
        .from('items')
        .select('id,archived_at')
        .eq('id', id)
        .maybeSingle();

      if (error || !data || data.archived_at) {
        Alert.alert('Item unavailable', 'This item is no longer listed.');
        setItems((prev) => prev.filter((it) => it.id !== id));
        return;
      }

      router.push(`/product/${id}`);
    },
    [router]
  );

  const renderItem = ({ item }: { item: ItemRow }) => {
    const wished = !!wish[item.id];
    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <TouchableOpacity
          onPress={() => toggleWishlist(item.id)}
          style={[styles.heartButton, { backgroundColor: c.card, borderColor: c.border }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Ionicons name={wished ? 'heart' : 'heart-outline'} size={20} color={wished ? '#EF4444' : c.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => openItem(item.id)} activeOpacity={0.85}>
          <Image
            source={{ uri: item.image_url || 'https://via.placeholder.com/300x300.png?text=No+Image' }}
            style={styles.image}
            resizeMode="contain"
          />
          <View style={styles.cardContent}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.description, { color: c.muted }]} numberOfLines={2}>
              {item.description ?? ''}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ---------- Header (wrapped to center on web) ----------
  const ListHeader = useMemo(
    () => (
      <>
        {/* Banner constrained to page max-width on web */}
        <View style={pageWrap(WEB_MAX_WIDTH)}>
          <HomeBanner onExplore={() => router.push('/home')} onListItem={() => router.push('/swap')} />
        </View>

        {/* Search + Sort + Filters + Count all centered */}
        <View style={pageWrap(WEB_MAX_WIDTH)}>
          {/* Search */}
          <View style={{ paddingHorizontal: 8, marginBottom: 8 }}>
            <FSInput
              placeholder="Search items…"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              endAdornment={
                !!query ? (
                  <Text
                    onPress={() => setQuery('')}
                    style={{ color: c.muted, fontWeight: '600', paddingHorizontal: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                  >
                    Clear
                  </Text>
                ) : null
              }
            />
          </View>

          {/* Sort chips */}
          <View style={styles.chipsRow}>
            {(['newest', 'oldest'] as const).map((opt) => {
              const active = sort === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setSort(opt)}
                  style={[
                    styles.chip,
                    { backgroundColor: c.card, borderColor: c.border },
                    active && { backgroundColor: c.tint, borderColor: c.tint },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipTxt, { color: c.text }, active && styles.chipTxtActive]}>
                    {opt === 'newest' ? 'Newest' : 'Oldest'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Filters */}
          <View style={styles.chipsRow}>
            <TouchableOpacity
              onPress={() => setOnlyWishlisted((v) => !v)}
              style={[
                styles.chip,
                { backgroundColor: c.card, borderColor: c.border },
                onlyWishlisted && { backgroundColor: c.tint, borderColor: c.tint },
              ]}
              accessibilityRole="switch"
              accessibilityState={{ checked: onlyWishlisted }}
            >
              <Text style={[styles.chipTxt, { color: c.text }, onlyWishlisted && styles.chipTxtActive]}>
                Wishlisted
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setWithImagesOnly((v) => !v)}
              style={[
                styles.chip,
                { backgroundColor: c.card, borderColor: c.border },
                withImagesOnly && { backgroundColor: c.tint, borderColor: c.tint },
              ]}
              accessibilityRole="switch"
              accessibilityState={{ checked: withImagesOnly }}
            >
              <Text style={[styles.chipTxt, { color: c.text }, withImagesOnly && styles.chipTxtActive]}>
                With image
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={{ marginLeft: 12, marginBottom: 6, color: c.muted }}>
            {displayItems.length} result{displayItems.length === 1 ? '' : 's'}
          </Text>
        </View>
      </>
    ),
    [router, query, c, sort, onlyWishlisted, withImagesOnly, displayItems.length]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        key={`grid-${numColumns}`}
        data={displayItems}
        keyExtractor={(item) => String(item.id)}
        numColumns={numColumns}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        // Center the grid on web and add page gutters
        contentContainerStyle={[pageContent(WEB_MAX_WIDTH), { paddingBottom: 100 }]}
        columnWrapperStyle={numColumns > 1 ? { gap: 6 } : undefined}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: c.muted }]}>
            {loading ? 'Loading…' : 'No items found.'}
          </Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.text} />
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
    borderRadius: 16,
    paddingVertical: 24,
    marginHorizontal: Platform.select({ web: 4, default: 8 }),
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  bannerInner: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  brand: { fontSize: 32, fontWeight: '800', letterSpacing: 0.5 },
  tagline: { fontSize: 16, maxWidth: 680 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  blobA: {
    position: 'absolute', width: 220, height: 220, borderRadius: 999,
    backgroundColor: '#FDE68A55', top: -60, right: -40,
  },
  blobB: {
    position: 'absolute', width: 180, height: 180, borderRadius: 999,
    backgroundColor: '#5EEAD455', bottom: -50, left: -30,
  },

  // --- List/Grid ---
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16 },

  // --- Cards ---
  card: {
    flex: 1,
    borderRadius: 12,
    margin: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
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
  title: { fontSize: 14, fontWeight: '600' },
  description: { fontSize: 12, marginTop: 4 },

  // --- Heart overlay ---
  heartButton: {
    position: 'absolute',
    zIndex: 2,
    right: 8,
    top: 8,
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1, // color set at render-time
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },

  // --- Search & Sort ---
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, marginBottom: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipTxt: { fontWeight: '600' },
  chipTxtActive: { color: '#fff' },
});
