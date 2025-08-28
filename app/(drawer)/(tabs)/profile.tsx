// app/(drawer)/(tabs)/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { decode as atob } from 'base-64';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FSButton from '../../../components/buttons/FSButton';
import { pickAndCropImage } from '../../../components/media/pickAndCropImage';
import { emit, on } from '../../../lib/eventBus';
import { pageWrap, WEB_MAX_WIDTH } from '../../../lib/layout';
import { BUCKETS, userAvatarPath } from '../../../lib/storage';
import { supabase } from '../../../lib/supabase';
import { radius, spacing, type as tt, useColors } from '../../../lib/theme';

type ProfileRow = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  push_enabled?: boolean | null;
  created_at?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
};

type ItemLite = {
  id: string;
  title: string | null;
  image_url: string | null;
  archived_at: string | null;
};

// Convert base64 to bytes on native; on web we will pass a Blob instead
const b64ToUint8 = (b64: string) => {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

// Web: Blob via fetch; Native: bytes via FileSystem base64
const toBytes = async (uri: string): Promise<Uint8Array | Blob> => {
  if (Platform.OS === 'web') return await (await fetch(uri)).blob();
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return b64ToUint8(base64);
};

export default function ProfileScreen() {
  const c = useColors();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemLite[]>([]);
  const [uploading, setUploading] = useState(false);
  const [following, setFollowing] = useState(false);

  // ----- LOADERS -----
  const loadProfileAndItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;
      setUid(userId);
      setEmail(auth.user?.email ?? null);

      if (!userId) {
        setProfile(null);
        setItems([]);
        return;
      }

      const { data: row, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, interests, rating_avg, rating_count')
        .eq('id', userId)
        .single();
      if (profErr) throw profErr;
      setProfile(row as ProfileRow);

      const { data: itemRows, error: itemsErr } = await supabase
        .from('items')
        .select('id,title,image_url,archived_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (itemsErr) throw itemsErr;

      setItems((itemRows ?? []) as ItemLite[]);
    } catch (e: any) {
      console.warn('profile load error:', e);
      Alert.alert('Error', e?.message ?? 'Could not load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  const [counts, setCounts] = useState<{ items: number; active: number; wishlist: number; swaps: number }>({
    items: 0, active: 0, wishlist: 0, swaps: 0,
  });

  const loadCounts = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;

      const [{ count: items }, { count: active }, { count: wish }, { count: swaps }] = await Promise.all([
        supabase.from('items').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('items').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('archived_at', null),
        supabase.from('wishlist').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('swaps').select('id', { count: 'exact', head: true }).or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
      ]);
      setCounts({ items: items ?? 0, active: active ?? 0, wishlist: wish ?? 0, swaps: swaps ?? 0 });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { loadProfileAndItems(); }, [loadProfileAndItems]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  useEffect(() => {
    const off = on('profile:changed', loadProfileAndItems);
    return off;
  }, [loadProfileAndItems]);

  // Also refetch counts (and optionally items) when related things change
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleCountsRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => {
      loadCounts();
      // Optionally also refresh the item grid:
      // loadProfileAndItems();
    }, 200);
  }, [loadCounts]);

  useEffect(() => {
    const offA = on('items:changed', scheduleCountsRefetch);
    const offB = on('wishlist:changed', scheduleCountsRefetch);
    const offC = on('swaps:changed', scheduleCountsRefetch);
    return () => {
      offA(); offB(); offC();
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [scheduleCountsRefetch]);

  useFocusEffect(React.useCallback(() => {
    loadProfileAndItems();
    loadCounts();
  }, [loadProfileAndItems, loadCounts]));

  // ----- UI helpers -----
    const initials = useMemo(() => {
    const name = profile?.full_name || email || 'User';
    

    return name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  }, [profile?.full_name, email]);

  const firstName = useMemo(() => {
    const n = (profile?.full_name || '').trim();
    if (!n) return 'there';
    return n.split(' ')[0] || 'there';
  }, [profile?.full_name]);

  // Avatar upload using a stable path + cache bust to force refresh
  const hasAvatar = !!profile?.avatar_url;
  const pickAvatar = useCallback(async () => {
    if (!uid) return;
    try {
      const picked = await pickAndCropImage({ aspect: [1, 1], quality: 0.9 });
      if (!picked) return;

      setUploading(true);

      const path = userAvatarPath(uid);
      const body = await toBytes(picked.uri);

      const { error: upErr } = await supabase
        .storage
        .from(BUCKETS.AVATARS)
        .upload(path, body, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKETS.AVATARS).getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { data: updated, error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', uid)
        .select('id, full_name, avatar_url, bio, interests, rating_avg, rating_count')
        .single();
      if (updErr) throw updErr;

      const bust = `${updated.avatar_url ?? publicUrl}?v=${Date.now()}`;
      setProfile(p => (p ? { ...updated, avatar_url: bust } as ProfileRow : { ...(updated as ProfileRow), avatar_url: bust }));

      emit('profile:changed');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Could not update your profile picture.');
    } finally {
      setUploading(false);
    }
  }, [uid]);

  const ratingAvg = Math.max(0, Math.min(5, profile?.rating_avg ?? 0));
  const ratingCount = profile?.rating_count ?? 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: spacing.lg }}>
      <View style={[pageWrap(WEB_MAX_WIDTH)]}>
        <View style={{ padding: spacing.lg }}>
          <Text style={[styles.h1, { color: c.text }]}>Hey {firstName}!</Text>

          {/* Profile card */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={pickAvatar}
                  activeOpacity={0.85}
                  style={[styles.avatarPress, { borderColor: c.border, backgroundColor: c.bg }]}
                  >
                  {hasAvatar ? (
                  <Image
                  key={profile?.avatar_url}                          // force rerender when uri changes
                  source={{ uri: profile?.avatar_url as string }}    
                  style={styles.avatarImage}
                  resizeMode="contain"
                  />
                  ) : (
                  <Text style={{ color: c.text, fontWeight: '800', fontSize: 18 }}>{initials}</Text>
                )}

                {(!hasAvatar || uploading) && (
                <View style={[styles.cameraBadge, { backgroundColor: c.card, borderColor: c.border }]}>
                <Ionicons name="camera" size={14} color={c.muted} />
                <Text style={{ color: c.muted, fontSize: 11, marginLeft: 4 }}>
                  {uploading ? 'Uploading…' : 'Update'}
                </Text>
                </View>
                  )}
                </TouchableOpacity>


              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                  {profile?.full_name || email || 'Anonymous'}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <StarRating value={ratingAvg} color={c.tint} />
                  <Text style={{ color: c.muted, fontSize: 12 }}>({ratingCount} reviews)</Text>
                </View>

                {!!uid && (
                  <TouchableOpacity
                    style={[styles.followBtn, { borderColor: c.border, backgroundColor: c.bg }]}
                    onPress={() => setFollowing(v => !v)}
                    disabled
                  >
                    <Ionicons name={following ? 'checkmark' : 'person-add'} size={14} color={c.muted} />
                    <Text style={{ color: c.muted, fontWeight: '700', marginLeft: 6 }}>Follow</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.statsRow}>
              <Stat label="Active" value={counts.active} />
              <Stat label="Items" value={counts.items} />
              <Stat label="Wishlist" value={counts.wishlist} />
              <Stat label="Swaps" value={counts.swaps} />
            </View>

            <View style={styles.actions}>
              <FSButton title="My Items" variant="secondary" onPress={() => router.push('/myitems')} />
              <FSButton
                title="Edit Profile"
                variant="secondary"
                onPress={() => uid && router.push({ pathname: '/profile/[Id]', params: { Id: uid } })}
              />
              <FSButton title="Browse" variant="secondary" onPress={() => router.push('/home')} />
              <FSButton
                title="Log Out"
                variant="danger"
                onPress={async () => {
                  await supabase.auth.signOut();
                  router.replace('/auth/login');
                }}
              />
            </View>
          </View>

          {/* About card (Bio + Interests) */}
          {(profile?.bio || (profile?.interests && profile.interests.length)) && (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, marginTop: spacing.lg }]}>
              {!!profile?.bio && (
                <>
                  <Text style={[styles.cardTitle, { color: c.text }]}>About</Text>
                  <Text style={{ color: c.text }}>{profile.bio}</Text>
                </>
              )}

              {!!profile?.interests?.length && (
                <>
                  <Text style={[styles.cardTitle, { color: c.text, marginTop: spacing.md }]}>Interests</Text>
                  <View style={styles.chipsWrap}>
                    {profile.interests.map((t) => (
                      <View key={t} style={[styles.chip, { backgroundColor: c.bg, borderColor: c.border }]}>
                        <Text style={{ color: c.text }}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Public items card */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, marginTop: spacing.lg }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Your Listed Items</Text>
            <View style={styles.grid}>
              {items
                .filter((it) => !it.archived_at)
                .map((it) => (
                  <TouchableOpacity
                    key={it.id}
                    activeOpacity={0.85}
                    style={[styles.tile, { borderColor: c.border, backgroundColor: c.bg }]}
                    onPress={() =>
                      router.push({ pathname: '/product/[ProductId]', params: { ProductId: it.id } })
                    }
                  >
                    <Image
                      source={{ uri: it.image_url || 'https://via.placeholder.com/600x800.png?text=No+Image' }}
                      style={styles.tileImg}
                      resizeMode="contain"
                    />
                    <Text style={[styles.tileTitle, { color: c.text }]} numberOfLines={1}>
                      {it.title || 'Untitled'}
                    </Text>
                  </TouchableOpacity>
                ))}
              {items.filter((it) => !it.archived_at).length === 0 && (
                <Text style={{ color: c.muted }}>No active items yet.</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const c = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

function StarRating({ value, color }: { value: number; color: string }) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const diff = value - i;
    const name = diff >= 1 ? 'star' : diff >= 0.5 ? 'star-half' : 'star-outline';
    return <Ionicons key={i} name={name as any} size={16} color={color} />;
  });
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{stars}</View>;
}

const AV = 64;

const styles = StyleSheet.create({
  h1: { fontSize: tt.title.size, lineHeight: tt.title.lineHeight, fontWeight: tt.title.weight, marginBottom: spacing.md },

  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
  cardTitle: { fontWeight: '800', fontSize: 16, marginBottom: spacing.sm },

  headerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },

  avatarPress: {
    width: AV,
    height: AV,
    borderRadius: AV / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },

  cameraBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },

  name: { fontSize: 18, fontWeight: '800' },

  followBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' },
  stat: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, minWidth: 110 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },

  actions: { marginTop: spacing.lg, gap: spacing.sm },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  tile: { width: '48%', borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  tileImg: { width: '100%', aspectRatio: 3 / 4, backgroundColor: 'rgba(0,0,0,0.06)' },
  tileTitle: { paddingHorizontal: 10, paddingVertical: 8, fontWeight: '600' },
});
