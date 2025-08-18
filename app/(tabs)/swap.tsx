// app/(tabs)/swap.tsx
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/theme';

const b64ToUint8 = (b64: string) => {
  const binary = global.atob ? global.atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export default function SwapScreen() {
  const c = useColors();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tradeFor, setTradeFor] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Ask for media-library permission and let user pick an image
  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo access to pick an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled) setImageUri(result.assets[0].uri);
    } catch (err) {
      console.error('[ImagePicker ERROR]', err);
      Alert.alert('Image Picker Error', 'Unable to open image picker.');
    }
  };

const toBytes = async (uri: string): Promise<Uint8Array | Blob> => {
  if (Platform.OS === 'web') {
    // web Blob is fine
    return await (await fetch(uri)).blob();
  }
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return b64ToUint8(base64); // <- no fetch('data:…') on native
};

  const uploadAndSubmit = async () => {
    if (!imageUri || !title || !description || !tradeFor) {
      Alert.alert('Missing info', 'Please fill out all fields and select an image.');
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

      // Upload image to Supabase Storage (user-photos bucket)
      const blob = await toBytes(imageUri);
      const { error: upErr } = await supabase
        .storage
        .from('user-photos')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: true });

      if (upErr) throw upErr;

      // Get a public URL for the stored image (works if bucket is public)
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

      Alert.alert('Success', 'Item listed for trade!');
      setTitle('');
      setDescription('');
      setTradeFor('');
      setImageUri(null);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      console.error('[UPLOAD ERROR]', err);
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <TouchableOpacity
        style={[styles.imagePicker, { backgroundColor: c.card, borderColor: c.border }]}
        onPress={pickImage}
        disabled={loading}
        activeOpacity={0.8}
      >
        {imageUri ? (
  <Image
    source={{ uri: imageUri }}
    style={styles.imagePreview}
    resizeMode="contain"   // 
  />
) : (
  <Text style={[styles.imagePlaceholder, { color: c.muted }]}>
    Tap to choose an image
  </Text>
)}
      </TouchableOpacity>

      <TextInput
        style={[
          styles.input,
          { backgroundColor: c.card, borderColor: c.border, color: c.text },
        ]}
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
        style={[
          styles.input,
          { backgroundColor: c.card, borderColor: c.border, color: c.text },
        ]}
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
        <Text style={styles.buttonText}>
          {loading ? 'Uploading…' : 'List Item'}
        </Text>
        {loading && <ActivityIndicator style={{ marginLeft: 10 }} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
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
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
