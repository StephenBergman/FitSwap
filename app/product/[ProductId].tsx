// app/product/[ProductId].tsx
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AddToWishlistButton from '../../components/wishlist/AddToWishlistButton';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/theme';

type Item = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  trade_for: string | null;
  user_id: string;
};

export default function ProductDetailsScreen() {
  const { ProductId } = useLocalSearchParams<{ ProductId?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const c = useColors();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ProductId) fetchItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ProductId]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', ProductId)
        .single();

      if (error) {
        console.error('Error fetching item:', error.message);
        Alert.alert('Error', error.message);
        return;
      }

      setItem(data as Item);
      navigation.setOptions({ title: data.title });
    } finally {
      setLoading(false);
    }
  };

  const handleSwapNow = () => {
    if (!item) return;
    router.push({ pathname: '/offer/offerscreen', params: { id: item.id } });
  };

  if (loading || !item) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.tint} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.imageWrap, { backgroundColor: c.card }]}>
          <Image
            source={{
              uri:
                item.image_url ||
                'https://via.placeholder.com/600x800.png?text=No+Image',
            }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>

        {!!item.description && (
          <Text style={[styles.description, { color: c.muted }]}>{item.description}</Text>
        )}

        <Text style={[styles.tradeLabel, { color: c.text }]}>Looking to trade for:</Text>
        <Text style={[styles.tradeText, { color: c.tint }]} numberOfLines={2}>
          {item.trade_for || 'Not specified'}
        </Text>

        <View style={styles.actions}>
          {/* Primary action */}
          <View style={{ width: '100%' }}>
            <Text
              onPress={handleSwapNow}
              style={[styles.primaryBtn, { backgroundColor: c.tint }]}
            >
              Request a swap
            </Text>
          </View>

          {/* Secondary action */}
          <View style={{ width: '100%' }}>
            <AddToWishlistButton itemId={item.id} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },

  imageWrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  image: {
    width: '100%',
    aspectRatio: 3 / 4, 
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },

  description: {
    fontSize: 16,
    marginBottom: 18,
  },

  tradeLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },

  tradeText: {
    fontSize: 16,
    marginBottom: 20,
  },

  actions: {
    marginTop: 4,
    gap: 10,
  },

  primaryBtn: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: '700',
    paddingVertical: 14,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
