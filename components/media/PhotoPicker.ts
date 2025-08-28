import { decode as atob } from 'base-64';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const b64ToUint8 = (b64: string) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

async function toBytes(uri: string): Promise<Uint8Array | Blob> {
  if (Platform.OS === 'web') return await (await fetch(uri)).blob();
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return b64ToUint8(b64);
}

/** Opens the image library with square-crop UI and returns uri + bytes/blob. */
export async function pickCroppedImage(opts?: { aspect?: [number, number]; quality?: number }) {
  const aspect = opts?.aspect ?? [1, 1];
  const quality = opts?.quality ?? 0.9;

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') return null;

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect,
    quality,
  });
  if (res.canceled) return null;

  const uri = res.assets[0].uri;
  const bytes = await toBytes(uri);
  return { uri, bytes };
}
