// components/media/pickAndCropImage.ts
// Simple, reusable image picker with square cropping via the system editor.
// No extra deps; works on iOS/Android/Web.

import * as ImagePicker from 'expo-image-picker';

export type PickCropResult = {
  uri: string;
  width?: number;
  height?: number;
} | null;

type Options = {
  aspect?: [number, number]; // default: [1,1] (square)
  quality?: number;          // 0..1 (default 0.9)
  allowsEditing?: boolean;   // default true
};

export async function pickAndCropImage(
  { aspect = [1, 1], quality = 0.9, allowsEditing = true }: Options = {}
): Promise<PickCropResult> {
  // Ask for media library permission if needed
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    return null;
  }

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing,
    aspect,
    quality,
    exif: false,
  });

  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, width: a.width, height: a.height };
}
