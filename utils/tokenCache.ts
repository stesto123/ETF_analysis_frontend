import * as SecureStore from 'expo-secure-store';

// IMPORTANT: Clerk expects a token cache with (key, value) signatures.
// Using a single fixed key breaks session management and can cause "signed_out" errors.

// On some platforms (e.g. web), SecureStore may be unavailable. Provide a
// lightweight in-memory fallback so auth still works during a session.
const memoryCache: Record<string, string> = {};
let secureStoreAvailable: boolean | null = null;

async function isSecureStoreAvailable(): Promise<boolean> {
  if (secureStoreAvailable !== null) return secureStoreAvailable;
  try {
    secureStoreAvailable = await SecureStore.isAvailableAsync();
  } catch {
    secureStoreAvailable = false;
  }
  return secureStoreAvailable;
}

export const tokenCache = {
  getToken: async (key: string): Promise<string | null> => {
    try {
      if (await isSecureStoreAvailable()) {
        return await SecureStore.getItemAsync(key);
      }
      return memoryCache[key] ?? null;
    } catch {
      // If SecureStore throws, fall back to memory
      return memoryCache[key] ?? null;
    }
  },
  saveToken: async (key: string, value: string | null): Promise<void> => {
    try {
      if (await isSecureStoreAvailable()) {
        if (value) {
          await SecureStore.setItemAsync(key, value);
        } else {
          await SecureStore.deleteItemAsync(key);
        }
        return;
      }
    } catch {
      // if SecureStore errors, use memory fallback below
    }

    if (value) {
      memoryCache[key] = value;
    } else {
      delete memoryCache[key];
    }
  },
};
