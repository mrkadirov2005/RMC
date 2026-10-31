import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// @MOB-102 Tokens live in the OS keychain/keystore. The web build (used for previews) has no
// secure store, so it falls back to localStorage.
const webStore = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return webStore()?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      webStore()?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      webStore()?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
