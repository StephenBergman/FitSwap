// app/(tabs)/swap.tsx
import { decode as atob } from 'base-64';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { pickAndCropImage } from '../../../components/media/pickAndCropImage';
import { useToast } from '../../../components/toast/ToastProvider';
import { pageWrap, WEB_NARROW } from '../../../lib/layout';
import { supabase } from '../../../lib/supabase';
import { useColors } from '../../../lib/theme';

// Convert a local file URI to bytes/Blob (same approach as the profile screen)
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

export default function SwapScreen() {
  const c = useColors();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tradeFor, setTradeFor] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

 
  const pickImage = async () => {
    try {
      const res = await pickAndCropImage({ aspect: [1, 1], quality: 0.9 });
      if (!res) return; // user canceled or permission denied
      setImageUri(res.uri);
    } catch (err) {
      console.error('[ImagePicker ERROR]', err);
      toast({ message: 'Unable to open image picker.' });
    }
  };

  const uploadAndSubmit = async () => {
    if (!imageUri || !title.trim() || !description.trim() || !tradeFor.trim()) {
      toast({ message: 'Please fill out all fields and select an image.' });
      return;
    }

    try {
      setLoading(true);

      // Ensure we have a logged-in user
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error('User not authenticated.');

      // Make a user-scoped filename to avoid collisions
      const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

      // Convert local URI to bytes/blob before upload
      const bytes = await toBytes(imageUri);

      // Upload image to Supabase Storage
      const { error: upErr } = await supabase
        .storage
        .from('user-photos')
        .upload(filename, bytes, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;

      // Get a public URL for the stored image
      const { data: pub } = supabase.storage.from('user-photos').getPublicUrl(filename);
      const publicUrl = pub.publicUrl;

      // Insert item into DB
      const { error: insertError } = await supabase.from('items').insert([{
        user_id: user.id,
        title,
        description,
        image_url: publicUrl,
        trade_for: tradeFor,
      }]);
      if (insertError) throw insertError;

      // Success feedback via toast
      toast({ message: 'Item listed for trade!' });

      setTitle('');
      setDescription('');
      setTradeFor('');
      setImageUri(null);
      router.replace('/(drawer)/(tabs)/home');
    } catch (err: any) {
      console.error('[UPLOAD ERROR]', err);
      toast({ message: err?.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[pageWrap(WEB_NARROW), styles.container]}>
        <TouchableOpacity
          style={[styles.imagePicker, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={pickImage}
          disabled={loading}
          activeOpacity={0.8}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
          ) : (
            <Text style={[styles.imagePlaceholder, { color: c.muted }]}>
              Tap to choose an image
            </Text>
          )}
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
          placeholder="Title"
          placeholderTextColor={c.muted}
          value={title}
          onChangeText={setTitle}
          editable={!loading}
        />

        <TextInput
          style={[
            styles.input,
            styles.textarea,
            { backgroundColor: c.card, borderColor: c.border, color: c.text },
          ]}
          placeholder="Description"
          placeholderTextColor={c.muted}
          multiline
          value={description}
          onChangeText={setDescription}
          editable={!loading}
        />

        <TextInput
          style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
          placeholder="Looking to trade for..."
          placeholderTextColor={c.muted}
          value={tradeFor}
          onChangeText={setTradeFor}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: c.tint, opacity: loading ? 0.7 : 1 }]}
          onPress={uploadAndSubmit}
          disabled={loading}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>{loading ? 'Uploading…' : 'List Item'}</Text>
          {loading && <ActivityIndicator style={{ marginLeft: 10 }} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // no horizontal padding here; pageWrap already does that on web
  container: { paddingVertical: 20, flex: 1 },

  imagePicker: {
    height: 220,
    borderWidth: 1,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { fontSize: 14 },

  input: {
    borderWidth: 1,
    marginBottom: 14,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },

  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  previewBox: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
});
