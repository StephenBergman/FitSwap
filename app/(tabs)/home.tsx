import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

function HomeBanner({ onExplore, onListItem }: { onExplore: () => void; onListItem: () => void }) {
  return (
    <View style={styles.banner}>
      {/* Decorative blobs */}
      <View style={styles.blobA} />
      <View style={styles.blobB} />

      {/* Centered content */}
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

        {/* Mini highlights like SHEIN strips */}
        <View style={styles.badgesRow}>
          <View style={styles.badge}><Text style={styles.badgeText}>No fees</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>Local & mail-in</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>Sustainable</Text></View>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Fetch Error]', error.message);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/product/${item.id}`)}
      activeOpacity={0.85}
    >
      <Image
        source={{
          uri: item.image_url || 'https://via.placeholder.com/300x300.png?text=No+Image',
        }}
        style={styles.image}
        resizeMode="contain"
      />
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id.toString()}
      numColumns={6}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <HomeBanner
          onExplore={() => router.push('/')}
          onListItem={() => router.push('/swap')} // change to your "create item" route if different
        />
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>No items found. Try uploading some!</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  // --- Banner ---
  banner: {
    position: 'relative',
    backgroundColor: '#FFF4F7', // soft, feminine base
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
  tagline: {
    fontSize: 16,
    color: '#334155',
    maxWidth: 680,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  ctaPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#06B6D4', // teal-ish
  },
  ctaPrimaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  ctaGhost: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#06B6D4',
  },
  ctaGhostText: {
    color: '#06B6D4',
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  blobA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: '#FDE68A55', // warm accent
    top: -60,
    right: -40,
  },
  blobB: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: '#5EEAD455', // teal accent
    bottom: -50,
    left: -30,
  },

  // --- List/Grid ---
  list: {
    padding: 8,
    paddingBottom: 100,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 50,
    fontSize: 16,
  },

  // --- Cards ---
  card: {
    alignItems: 'center',
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
    maxWidth: '20%',
    maxHeight: '100%',
  },
  image: {
    width: '100%',
    height: 220,
    backgroundColor: '#f0f0f0',
    aspectRatio: 3 / 4,
    alignSelf: 'stretch',
  },
  cardContent: {
    width: '100%',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
