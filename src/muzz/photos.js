// ─── Photo picker + upload helper ───────────────────────────────────
// Wraps expo-image-picker (works on web via file input) and uploads to
// the backend when configured, returning a usable URI either way.

import * as ImagePicker from 'expo-image-picker';
import * as api from './api';

// Opens the gallery, returns a local uri (or null if cancelled).
export async function pickImage() {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted' && perm.status !== undefined) {
      // web returns undefined; native denies → bail quietly
      if (perm.status === 'denied') return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions ? ImagePicker.MediaTypeOptions.Images : 'images',
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (result.canceled) return null;
    return result.assets?.[0]?.uri || null;
  } catch (e) {
    return null;
  }
}

// Picks an image and, if the backend is up, uploads it. Always returns a
// uri to display immediately (local uri, falling back gracefully).
export async function pickAndUpload() {
  const uri = await pickImage();
  if (!uri) return null;
  if (api.isConfigured() && (await api.isAvailable())) {
    try {
      const { url } = await api.uploadPhoto(uri);
      return url || uri;
    } catch {
      return uri;
    }
  }
  return uri;
}
