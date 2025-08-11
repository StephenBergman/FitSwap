import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';


type VUserSwap = {
  id: string;
  item_id: string;
  offered_item_id: string | null;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'canceled';
  created_at: string;
  updated_at?: string | null;
  offered_id: string | null;
  offered_title: string | null;
  offered_image_url: string | null;
  requested_id: string;
  requested_title: string | null;
  requested_image_url: string | null;
};

type JoinedSwap = {
  id: string;
  item_id: string;
  offered_item_id: string | null;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  status: any;
  created_at: string;
  offered?: any;
  requested?: any;
};

export default function MySwapsScreen() {
  const [includeSelf, setIncludeSelf] = useState<boolean>(__DEV__);
  const [swaps, setSwaps] = useState<VUserSwap[]>([]);
  const [tab, setTab] = useState<'sent' | 'received'>('received');
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      // 1) Try the view (cleanest)
      const { data: vRows, error: vErr } = await supabase
        .from('v_user_swaps')
        .select('*')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order('created_at', { ascending: false });

      if (!vErr && (vRows?.length ?? 0) > 0) {
        setSwaps(vRows as VUserSwap[]);
        return;
      }
      console.log('[v_user_swaps] fallback engaged', { vErr, rows: vRows?.length ?? 0 });

      // 2) Fallback: join with FK names (works if relationships are cached)
      const { data: jRows, error: jErr } = await supabase
        .from('swaps')
        .select(`
          id, item_id, offered_item_id, sender_id, receiver_id, message, status, created_at,
          offered:items!swaps_offered_item_id_fkey ( id, title, image_url ),
          requested:items!swaps_item_id_fkey      ( id, title, image_url )
        `)
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order('created_at', { ascending: false });

      if (!jErr && (jRows?.length ?? 0) > 0) {
        // normalize join -> view shape
        const normalized: VUserSwap[] = (jRows as JoinedSwap[]).map((s) => {
          const off = Array.isArray(s.offered) ? s.offered[0] : s.offered;
          const req = Array.isArray(s.requested) ? s.requested[0] : s.requested;
          return {
            id: s.id,
            item_id: s.item_id,
            offered_item_id: s.offered_item_id ?? null,
            sender_id: s.sender_id,
            receiver_id: s.receiver_id,
            message: s.message ?? null,
            status: s.status as VUserSwap['status'],
            created_at: s.created_at,
            offered_id: off?.id ?? null,
            offered_title: off?.title ?? null,
            offered_image_url: off?.image_url ?? null,
            requested_id: req?.id ?? s.item_id,
            requested_title: req?.title ?? null,
            requested_image_url: req?.image_url ?? null,
          };
        });
        setSwaps(normalized);
        return;
      }
      console.log('[swaps join] also empty', { jErr, rows: jRows?.length ?? 0 });

      // 3) Last resort: two-step fetch (works even if joins fail)
      const { data: sRows, error: sErr } = await supabase
        .from('swaps')
        .select('id,item_id,offered_item_id,sender_id,receiver_id,message,status,created_at')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order('created_at', { ascending: false });

      if (sErr || !sRows?.length) {
        console.error('[fallback swaps only] error or empty', sErr);
        setSwaps([]);
        return;
      }

      const ids = Array.from(
        new Set(
          sRows.flatMap(s => [s.offered_item_id, s.item_id]).filter(Boolean) as string[]
        )
      );
      const { data: items } = await supabase
        .from('items')
        .select('id,title,image_url')
        .in('id', ids);

      const byId = new Map((items ?? []).map(i => [i.id, i]));
      const formatted: VUserSwap[] = sRows.map(s => {
        const off = s.offered_item_id ? byId.get(s.offered_item_id) : null;
        const req = byId.get(s.item_id);
        return {
          id: s.id,
          item_id: s.item_id,
          offered_item_id: s.offered_item_id ?? null,
          sender_id: s.sender_id,
          receiver_id: s.receiver_id,
          message: s.message ?? null,
          status: s.status as VUserSwap['status'],
          created_at: s.created_at,
          offered_id: off?.id ?? null,
          offered_title: off?.title ?? null,
          offered_image_url: off?.image_url ?? null,
          requested_id: req?.id ?? s.item_id,
          requested_title: req?.title ?? null,
          requested_image_url: req?.image_url ?? null,
        };
      });

      setSwaps(formatted);
    };

    load();
  }, []);

const { sent, received } = useMemo(() => {
  if (!userId) return { sent: [] as VUserSwap[], received: [] as VUserSwap[] };

  const allSent = swaps.filter(s => s.sender_id === userId);
  const allReceived = swaps.filter(s => s.receiver_id === userId);

  if (includeSelf) {
    return { sent: allSent, received: allReceived };
  }
  // hide self-swaps
  return {
    sent: allSent.filter(s => s.receiver_id !== userId),
    received: allReceived.filter(s => s.sender_id !== userId),
  };
}, [swaps, userId, includeSelf]);


  const filtered = tab === 'sent' ? sent : received;

  const renderItem = ({ item }: { item: VUserSwap }) => {
    const isSent = item.sender_id === userId;
    const thumb = isSent ? item.requested_image_url : item.offered_image_url;
    const title = isSent
      ? item.requested_title ?? 'Requested item'
      : item.offered_title ?? 'Offered item';
    const label = isSent ? 'Requesting:' : 'They offered:';

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Image
            source={{ uri: thumb || 'https://via.placeholder.com/300x400.png?text=No+Image' }}
            style={styles.thumb}
            resizeMode="cover"
          />
          <View style={styles.info}>
            <Text style={styles.title}>Swap Request</Text>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value} numberOfLines={1}>{title}</Text>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{item.status}</Text>
            {!!item.message && (
              <>
                <Text style={styles.label}>Message:</Text>
                <Text style={styles.value} numberOfLines={2}>{item.message}</Text>
              </>
            )}
            <TouchableOpacity onPress={() => router.push(`/swaps/${item.id}`)}>
              <Text style={styles.link}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Swaps</Text>

      {/* dev toggle for self-swaps */}
<View style={styles.selfRow}>
  <Text style={styles.selfLabel}>Include self-swaps</Text>
  <Switch value={includeSelf} onValueChange={setIncludeSelf} />
</View>


      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setTab('received')}
          style={[styles.tabBtn, tab === 'received' && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === 'received' && styles.tabTextActive]}>
            Received ({received.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('sent')}
          style={[styles.tabBtn, tab === 'sent' && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === 'sent' && styles.tabTextActive]}>
            Sent ({sent.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Text>No swaps yet!</Text>}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const THUMB_W = 56;

const styles = StyleSheet.create({
  selfRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  selfLabel: { color: '#475569' },
  container: { padding: 20, flex: 1 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#d0d7de' },
  tabActive: { backgroundColor: '#0ea5e9' },
  tabText: { fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  card: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 12 },
  thumb: { width: THUMB_W, height: THUMB_W * (4 / 3), borderRadius: 8, backgroundColor: '#eee' },
  info: { flex: 1 },
  title: { fontWeight: 'bold', marginBottom: 8, fontSize: 16 },
  label: { fontWeight: '600', marginTop: 4 },
  value: { marginBottom: 2 },
  link: { color: '#007AFF', marginTop: 10, fontWeight: '500' },
});
