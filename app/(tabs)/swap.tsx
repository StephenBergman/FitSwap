import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

export default function SwapScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tradeFor, setTradeFor] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('[ImagePicker ERROR]', err);
      Alert.alert('Image Picker Error', 'Unable to open image picker.');
    }
  };

  const uploadAndSubmit = async () => {
    if (!imageUri || !title || !description || !tradeFor) {
      Alert.alert('Missing info', 'Please fill out all fields and select an image.');
      return;
    }

    try {
      setLoading(true);
      const filename = `${Date.now()}.jpg`;

      console.log('[1] Reading image...');
      let blob: Blob;

      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        blob = await response.blob();
      } else {
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (!base64 || base64.length < 10) {
          throw new Error('Base64 image data is invalid or empty.');
        }

        console.log('[2] Converting base64 to Blob...');
        blob = await (await fetch(`data:image/jpeg;base64,${base64}`)).blob();
      }

      console.log('[3] Fetching access token...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error('Failed to retrieve access token');
      }

      console.log('[4] Uploading image...');
      const uploadRes = await fetch(
        `https://dsivhrumkuileojbkffm.supabase.co/storage/v1/object/user-photos/${filename}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'image/jpeg',
            'x-upsert': 'true',
          },
          body: blob,
        }
      );

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        throw new Error(`Image upload failed: ${uploadRes.status} - ${text}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('user-photos').getPublicUrl(filename);

      console.log('[5] Getting current user...');
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User not authenticated.');
      }

      console.log('[6] Inserting item into table...');
      const { error: insertError } = await supabase.from('items').insert([
        {
          user_id: user.id,
          title,
          description,
          image_url: publicUrl,
          trade_for: tradeFor,
        },
      ]);

      if (insertError) {
        throw new Error(`Insert failed: ${insertError.message}`);
      }

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
    <View style={styles.container}>
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
        ) : (
          <Text style={styles.imagePlaceholder}>Tap to choose an image</Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Description"
        multiline
        value={description}
        onChangeText={setDescription}
      />
      <TextInput
        style={styles.input}
        placeholder="Looking to trade for..."
        value={tradeFor}
        onChangeText={setTradeFor}
      />

      <TouchableOpacity style={styles.button} onPress={uploadAndSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Uploading...' : 'List Item'}</Text>
        {loading && <ActivityIndicator style={{ marginLeft: 10 }} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flex: 1,
  },
  imagePicker: {
    height: 200,
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imagePlaceholder: {
    color: '#777',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 15,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
