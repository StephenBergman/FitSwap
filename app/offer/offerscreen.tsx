// app/offer/offerscreen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useToast } from '../../components/toast/ToastProvider';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/theme';

type ItemRow = { id: string; title: string; image_url: string | null };

export default function OfferScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>(); // requested item id
  const router = useRouter();
  const c = useColors();
  const toast = useToast();

  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [myItems, setMyItems] = useState<ItemRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load receiver (owner of the requested item) and the current user's items
  useEffect(() => {
    const load = async () => {
      try {
        if (!id) return;

        // 1) Who owns the item we're requesting?
        const { data: itemRow, error: itemErr } = await supabase
          .from('items')
          .select('user_id')
          .eq('id', id)
          .single();

        if (itemErr) throw itemErr;
        setReceiverId(itemRow?.user_id ?? null);

        // 2) Load my items to choose from
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!user?.id) {
          toast({ message: 'Please sign in to send an offer.' });
          return;
        }

        const { data: mine, error: myErr } = await supabase
          .from('items')
          .select('id,title,image_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (myErr) throw myErr;
        setMyItems((mine ?? []) as ItemRow[]);
      } catch (e: any) {
        console.error('[Offer load error]', e);
        toast({ message: e?.message ?? 'Failed to prepare offer screen.' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, toast]);

  const canSubmit = useMemo(
    () => !!id && !!receiverId && !!selectedId && !submitting,
    [id, receiverId, selectedId, submitting]
  );

  const submitOffer = useCallback(async () => {
    if (!canSubmit) return;

    try {
      setSubmitting(true);

      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr || !user?.id) {
        toast({ message: 'You must be logged in to send an offer.' });
        return;
      }

      if (receiverId === user.id) {
        toast({ message: 'You can’t send an offer on your own item.' });
        return;
      }

      const { error } = await supabase.from('swaps').insert({
        sender_id: user.id,
        receiver_id: receiverId,
        item_id: id, // requested item (theirs)
        offered_item_id: selectedId, // the one I picked
        message,
        status: 'pending',
      });

      if (error) throw error;

      toast({ message: 'Offer sent!' });
      router.replace('/(tabs)/myswaps');
    } catch (e: any) {
      console.error('[Submit offer error]', e);
      toast({ message: e?.message ?? 'Failed to submit offer.' });
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, id, message, receiverId, router, selectedId, toast]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20 }}>
      <Text style={[styles.header, { color: c.text }]}>Make an Offer</Text>

      {/* Choose one of my items */}
      <Text style={[styles.sectionTitle, { color: c.text }]}>Choose an item to offer</Text>

      {myItems.length === 0 ? (
        <View style={[styles.emptyWrap, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={{ color: c.muted, marginBottom: 10 }}>
            You don’t have any items listed yet.
          </Text>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: c.tint }]}
            onPress={() => router.push('/swap')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.tint }]}>List an item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={myItems}
          keyExtractor={(it) => it.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => {
            const selected = selectedId === item.id;
            return (
              <TouchableOpacity
                onPress={() => setSelectedId(item.id)}
                activeOpacity={0.85}
                style={[
                  styles.pickCard,
                  {
                    backgroundColor: c.card,
                    borderColor: selected ? c.tint : c.border,
                  },
                ]}
              >
                <Image
                  source={{
                    uri: item.image_url || 'https://via.placeholder.com/300x400.png?text=No+Image',
                  }}
                  style={styles.pickImage}
                  resizeMode="contain"
                />
                <Text style={[styles.pickTitle, { color: c.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {selected && (
                  <View style={[styles.selectedBadge, { backgroundColor: c.tint }]}>
                    <Text style={styles.selectedBadgeText}>Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Optional message */}
      <Text style={[styles.sectionTitle, { color: c.text }]}>Message (optional)</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Add a short note for the owner…"
        placeholderTextColor={c.muted}
        multiline
        style={[
          styles.input,
          {
            backgroundColor: c.card,
            color: c.text,
            borderColor: c.border,
          },
        ]}
      />

      {/* Submit */}
      <TouchableOpacity
        onPress={submitOffer}
        disabled={!canSubmit}
        style={[
          styles.primaryBtn,
          {
            backgroundColor: canSubmit ? c.tint : `${c.tint}55`,
          },
        ]}
      >
        <Text style={styles.primaryBtnText}>{submitting ? 'Submitting…' : 'Send Offer'}</Text>
      </TouchableOpacity>

      {/* Quick link to list a new item */}
      {myItems.length > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/swap')}
          style={[styles.secondaryBtn, { borderColor: c.border, marginTop: 12 }]}
        >
          <Text style={[styles.secondaryBtnText, { color: c.text }]}>List a new item</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const CARD_W = 140;
const CARD_H = 190;

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },

  pickCard: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },

  pickImageBox: {
    width: '100%',
    height: CARD_H - 58,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  pickImage: { width: '100%', height: CARD_H - 58 },
  pickTitle: { paddingHorizontal: 8, paddingTop: 8, fontWeight: '600' },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  selectedBadgeText: { color: '#fff', fontWeight: '700', fontSize: 10 },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },

  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },

  secondaryBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: '700' },

  emptyWrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
});
