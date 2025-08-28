// app/profile/[Id].tsx
import { decode as atob } from 'base-64';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FSButton from '../../components/buttons/FSButton';
import FSInput from '../../components/buttons/FSInput';
import { pickAndCropImage } from '../../components/media/pickAndCropImage';
import { useToast } from '../../components/toast/ToastProvider';
import { emit } from '../../lib/eventBus';
import { pageWrap, WEB_NARROW } from '../../lib/layout';
import { BUCKETS, userAvatarPath } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { radius, spacing, type as tt, useColors } from '../../lib/theme';

export const options = { title: 'Edit Profile' };

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  interests?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

// Convert base64 to bytes on native; on web we will pass a Blob instead
const b64ToUint8 = (b64: string) => {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};
const toBytes = async (uri: string): Promise<Uint8Array | Blob> => {
  if (Platform.OS === 'web') return await (await fetch(uri)).blob();
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return b64ToUint8(base64);
};

/* Tag editor (inline) */
function TagEditor({
  value, onChange, placeholder = 'Add an interest…',
}: { value: string[]; onChange: (next: string[]) => void; placeholder?: string }) {
  const c = useColors();
  const [text, setText] = useState('');
  const add = useCallback(() => {
    const t = text.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setText('');
  }, [text, value, onChange]);
  const remove = (t: string) => onChange(value.filter((x) => x !== t));

  return (
    <View>
      <View style={styles.tagsWrap}>
        {value.map((t) => (
          <View key={t} style={[styles.tag, { borderColor: c.border, backgroundColor: c.bg }]}>
            <Text style={{ color: c.text }}>{t}</Text>
            <Text onPress={() => remove(t)} style={{ color: c.muted, marginLeft: 8, fontWeight: '800' }}>×</Text>
          </View>
        ))}
      </View>
      <View style={[styles.tagInputRow, { borderColor: c.border, backgroundColor: c.card }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          style={[styles.tagInput, { color: c.text }]}
          onSubmitEditing={add}
          blurOnSubmit={false}
          autoCapitalize="words"
          returnKeyType="done"
        />
        <TouchableOpacity onPress={add} activeOpacity={0.8} style={[styles.addBtn, { backgroundColor: c.tint }]}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProfileEditScreen() {
  const { Id } = useLocalSearchParams<{ Id?: string }>();
  const c = useColors();
  const router = useRouter();
  const toast = useToast();

  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLocalUri, setAvatarLocalUri] = useState<string | null>(null);

  const isMine = !!me && !!Id && me === Id;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    if (!Id || Array.isArray(Id)) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: row, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, interests')
        .eq('id', Id)
        .maybeSingle();
      if (error) throw error;

      if (!row && me && me === Id) {
        const { error: upErr } = await supabase.from('profiles').upsert({ id: me }).select('id').single();
        if (upErr) throw upErr;
        setFullName(''); setBio(''); setInterests([]); setAvatarUrl(null);
      } else if (row) {
        setFullName(row.full_name ?? '');
        setBio(row.bio ?? '');
        setInterests(Array.isArray(row.interests) ? row.interests : []);
        setAvatarUrl(row.avatar_url ?? null);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not load profile.');
    } finally {
      setLoading(false);
    }
  }, [Id, me]);

  useEffect(() => { load(); }, [load]);

  const pickAvatar = useCallback(async () => {
    if (!isMine) return;
    try {
      const picked = await pickAndCropImage({ aspect: [1, 1], quality: 0.9 });
      if (picked) setAvatarLocalUri(picked.uri);
    } catch {
      Alert.alert('Image Picker Error', 'Unable to open image picker.');
    }
  }, [isMine]);

  const save = useCallback(async () => {
    if (!Id || Array.isArray(Id) || !isMine) return;
    setSaving(true);
    try {
      let newAvatarUrl: string | null = avatarUrl;

      if (avatarLocalUri) {
        const bytes = await toBytes(avatarLocalUri);
        const path = userAvatarPath(Id);
        const up = await supabase.storage.from(BUCKETS.AVATARS).upload(path, bytes, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        });
        if (up.error) throw up.error;
        const pub = supabase.storage.from(BUCKETS.AVATARS).getPublicUrl(path);
        newAvatarUrl = pub.data.publicUrl;
      }

      const { data: updated, error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
          interests,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', Id)
        .select('id, full_name, avatar_url, bio, interests')
        .single();

      if (error) throw error;

      setFullName(updated.full_name ?? '');
      setBio(updated.bio ?? '');
      setInterests(Array.isArray(updated.interests) ? updated.interests : []);
      setAvatarUrl(updated.avatar_url ?? null);
      setAvatarLocalUri(null);

      emit('profile:changed');
      toast({ message: 'Profile updated' });
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [Id, isMine, avatarUrl, avatarLocalUri, fullName, bio, interests, toast]);

  const canEdit = isMine;
  const avatarPreviewUri = avatarLocalUri ?? avatarUrl ?? undefined;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={pageWrap(WEB_NARROW)}>
          <View style={{ padding: spacing.lg }}>
            <Text style={[styles.h1, { color: c.text }]}>{canEdit ? 'Edit Profile' : 'Profile'}</Text>

            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.row}>
                <TouchableOpacity
                  onPress={pickAvatar}
                  disabled={!canEdit}
                  style={[
                    styles.avatar,
                    { borderColor: c.border, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Change profile photo"
                >
                  {avatarPreviewUri ? (
                    <Image
                      key={avatarPreviewUri} // force full re-render when uri changes
                      source={{ uri: avatarPreviewUri }}
                      style={{ width: '100%', height: '100%', borderRadius: AV / 2 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={[styles.avatarPlaceholder, { color: c.muted }]}>
                      {canEdit ? 'Tap to add photo' : 'No photo'}
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <FSInput
                    label="Name"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Your name"
                    editable={canEdit}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <FSInput
                label="Short bio"
                value={bio}
                onChangeText={setBio}
                placeholder="Tell people about your style, fit, or favorite brands"
                editable={canEdit}
                multiline
                style={{ height: 90, textAlignVertical: 'top' }}
              />

              <Text style={[styles.label, { color: c.muted }]}>Fashion interests</Text>
              <TagEditor value={interests} onChange={setInterests} />

              <View style={{ height: spacing.md }} />

              {saving ? (
                <ActivityIndicator color={c.tint} />
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {canEdit ? (
                    <>
                      <FSButton title="Save Changes" onPress={save} variant="success" size="lg" />
                      <FSButton title="Cancel" onPress={() => router.back()} variant="danger" size="lg" />
                    </>
                  ) : (
                    <FSButton title="Back" onPress={() => router.back()} variant="secondary" size="lg" />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const AV = 88;

const styles = StyleSheet.create({
  h1: { fontSize: tt.title.size, lineHeight: tt.title.lineHeight, fontWeight: tt.title.weight, marginBottom: spacing.md },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: { width: AV, height: AV, borderRadius: AV / 2, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  avatarPlaceholder: { textAlign: 'center', paddingHorizontal: 8, fontWeight: '700' },
  label: { fontSize: tt.cap.size, fontWeight: '700', marginBottom: spacing.xs, textTransform: 'uppercase' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm, marginTop: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  tagInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  tagInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  addBtn: { paddingHorizontal: 12, paddingVertical: 10, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
});
