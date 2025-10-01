import * as SecureStore from 'expo-secure-store';

const key = 'clerk_token_cache_v1';

export const tokenCache = {
  getToken: async () => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  saveToken: async (token: string | null) => {
    try {
      if (token) {
        await SecureStore.setItemAsync(key, token);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {
      // ignore
    }
  },
};
