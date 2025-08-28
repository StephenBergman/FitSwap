// app/product/[ProductId].tsx
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FSButton from '../../components/buttons/FSButton';
import { useToast } from '../../components/toast/ToastProvider';
import { emit } from '../../lib/eventBus';
import { pageContent, WEB_NARROW } from '../../lib/layout';
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
  const { ProductId } = useLocalSearchParams<{ ProductId?: string; from?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const c = useColors();
  const toast = useToast();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  // wishlist state for this user+item
  const [wishId, setWishId] = useState<string | null>(null);
  const [wlBusy, setWlBusy] = useState(false);

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
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        Alert.alert('Not found', 'This item is no longer available.');
        router.back();
        return;
      }

      setItem(data as Item);
      navigation.setOptions?.({ title: data.title || 'Item' });

      // initialize wishlist state
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (uid) {
        const { data: w } = await supabase
          .from('wishlist')
          .select('id')
          .eq('user_id', uid)
          .eq('item_id', data.id)
          .maybeSingle();
        setWishId(w?.id ?? null);
      } else {
        setWishId(null);
      }
    } catch (e: any) {
      console.error('Error fetching item:', e?.message ?? e);
      Alert.alert('Error', e?.message ?? 'Failed to load item.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSwap = () => {
    if (!item) return;
    router.push({ pathname: '/offer/offerscreen', params: { id: item.id } });
  };

  const toggleWishlist = useCallback(async () => {
    if (!item || wlBusy) return;
    setWlBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Please sign in', 'You need to be logged in to use the wishlist.');
        return;
      }

      // Remove if already there
      if (wishId) {
        const { error } = await supabase.from('wishlist').delete().eq('id', wishId);
        if (error) throw error;
        setWishId(null);
        emit('wishlist:changed');
        toast({ message: 'Removed from wishlist' });
        return;
      }

      // Otherwise insert
      const { data, error } = await supabase
        .from('wishlist')
        .insert({ user_id: user.id, item_id: item.id })
        .select('id')
        .single();
      if (error) throw error;

      setWishId(data.id);
      emit('wishlist:changed');
      toast({ message: 'Added to wishlist' });
    } catch (e: any) {
      console.error('[Wishlist error]', e);
      Alert.alert('Wishlist error', e?.message ?? 'Please try again.');
    } finally {
      setWlBusy(false);
    }
  }, [item, wishId, wlBusy, toast]);

  if (loading || !item) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.tint} />
      </View>
    );
  }

  // Hide wishlist button if the item belongs to the current user 
  // You can remove this block if you want it always visible.
  // const isMine = item.user_id === supabase.auth.getUser()?.data.user?.id

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[pageContent(WEB_NARROW), { padding: 16 }]}
    >
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.imageWrap, { backgroundColor: c.card }]}>
          <Image
            source={{ uri: item.image_url || 'https://via.placeholder.com/600x800.png?text=No+Image' }}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel={item.title}
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
          <FSButton title="Request a swap" onPress={handleRequestSwap} variant="primary" />

          <FSButton
            title={wishId ? 'Remove from Wishlist' : 'Add to Wishlist'}
            onPress={toggleWishlist}
            variant={wishId ? 'danger' : 'secondary'}
            disabled={wlBusy}
          />
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
});
