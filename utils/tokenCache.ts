import * as SecureStore from 'expo-secure-store';

// IMPORTANT: Clerk expects a token cache with (key, value) signatures.
// Using a single fixed key breaks session management and can cause "signed_out" errors.
export const tokenCache = {
  getToken: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  saveToken: async (key: string, value: string | null) => {
    try {
      if (value) {
        await SecureStore.setItemAsync(key, value);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {
      // ignore
    }
  },
};
