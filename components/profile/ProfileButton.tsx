// components/profile/ProfileButton.tsx
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { on } from '../../lib/eventBus';
import { ROUTES } from '../../lib/paths';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/theme';

export default function ProfileButton() {
  const c = useColors();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // load minimal profile info for header button
  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? null;
    setEmail(data.user?.email ?? null);

    if (!uid) {
      setAvatarUrl(null);
      return;
    }
    const { data: prof } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', uid)
      .maybeSingle();

    setAvatarUrl(prof?.avatar_url ?? null);
  }, []);

  useEffect(() => {
    let mounted = true;

    // initial load
    refresh();

    // update when auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (mounted) refresh();
    });

    // update when profile screen emits a change
    const off = on('profile:changed', () => {
      if (mounted) refresh();
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
      off();
    };
  }, [refresh]);

  // fallback initial when no avatar
  const initial = useMemo(() => (email?.[0]?.toUpperCase() ?? 'U'), [email]);

  return (
    <Pressable
      onPress={() => router.push(ROUTES.profile as any)}
      style={({ pressed }) => [
        styles.wrap,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.8 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Open profile"
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.circleImg} />
      ) : (
        <View style={[styles.circle, { backgroundColor: c.bg, borderColor: c.border }]}>
          <Text style={[styles.initial, { color: c.text }]}>{initial}</Text>
        </View>
      )}
    </Pressable>
  );
}

const SIZE = 30;

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  circleImg: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  initial: { fontWeight: '800' },
});
