import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// iCloud-backed key-value storage with a local mirror.
// - iOS (dev/production build): NSUbiquitousKeyValueStore — survives app
//   deletion + reinstall and syncs across the user's devices.
// - Everywhere else (Android/web/Expo Go): AsyncStorage fallback.
let native = null;
if (Platform.OS === 'ios') {
  try {
    const { requireOptionalNativeModule } = require('expo-modules-core');
    native = requireOptionalNativeModule ? requireOptionalNativeModule('CloudKV') : null;
  } catch {
    native = null;
  }
}

const MIRROR_PREFIX = 'ckv:';

export async function kvGet(key) {
  if (native) {
    try {
      const v = native.get(key);
      if (v !== null && v !== undefined) return v;
    } catch {}
  }
  try {
    return await AsyncStorage.getItem(MIRROR_PREFIX + key);
  } catch {
    return null;
  }
}

export async function kvSet(key, value) {
  const str = String(value);
  if (native) {
    try {
      native.set(key, str);
    } catch {}
  }
  try {
    await AsyncStorage.setItem(MIRROR_PREFIX + key, str);
  } catch {}
}

export function hasCloudBacking() {
  return !!native;
}
