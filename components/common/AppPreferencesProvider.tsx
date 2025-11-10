import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LEARN_TAB_KEY = '@app:preferences:learn-tab-enabled';

export type AppPreferencesContextValue = {
  learnTabEnabled: boolean;
  setLearnTabEnabled: (value: boolean) => Promise<void>;
  preferencesReady: boolean;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | undefined>(undefined);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [learnTabEnabled, setLearnTabEnabledState] = useState(true);
  const [preferencesReady, setPreferencesReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LEARN_TAB_KEY);
        if (stored != null && stored.length > 0) {
          if (active) {
            setLearnTabEnabledState(stored === 'true');
          }
        }
      } catch (error) {
        console.warn('Failed to read learn tab preference', error);
      } finally {
        if (active) {
          setPreferencesReady(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setLearnTabEnabled = useCallback(async (value: boolean) => {
    setLearnTabEnabledState(value);
    try {
      await AsyncStorage.setItem(LEARN_TAB_KEY, value ? 'true' : 'false');
    } catch (error) {
      console.warn('Failed to persist learn tab preference', error);
    }
  }, []);

  const contextValue = useMemo<AppPreferencesContextValue>(
    () => ({ learnTabEnabled, setLearnTabEnabled, preferencesReady }),
    [learnTabEnabled, setLearnTabEnabled, preferencesReady]
  );

  return (
    <AppPreferencesContext.Provider value={contextValue}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences(): AppPreferencesContextValue {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) {
    throw new Error('useAppPreferences must be used within AppPreferencesProvider');
  }
  return ctx;
}
