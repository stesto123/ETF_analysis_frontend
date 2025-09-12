import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeName = 'light' | 'dark';

type ThemeColors = {
  background: string;
  card: string;
  text: string;
  secondaryText: string;
  border: string;
  accent: string;
  success: string;
  danger: string;
  chartBackground: string;
  chartGrid: string;
};

const lightColors: ThemeColors = {
  background: '#F3F4F6',
  card: '#FFFFFF',
  text: '#111827',
  secondaryText: '#6B7280',
  border: '#E5E7EB',
  accent: '#2563EB',
  success: '#10B981',
  danger: '#DC2626',
  chartBackground: '#FFFFFF',
  chartGrid: '#E5E7EB',
};

const darkColors: ThemeColors = {
  background: '#0B1220',
  card: '#111827',
  text: '#E5E7EB',
  secondaryText: '#9CA3AF',
  border: '#1F2937',
  accent: '#3B82F6',
  success: '#34D399',
  danger: '#F87171',
  chartBackground: '#0F172A',
  chartGrid: '#1F2937',
};

type ThemeContextType = {
  theme: ThemeName;
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (t: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>('light');

  // load stored preference
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') setTheme(saved);
      } catch {}
    })();
  }, []);

  // persist preference
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, theme).catch(() => {});
  }, [theme]);

  const value = useMemo<ThemeContextType>(() => ({
    theme,
    colors: theme === 'dark' ? darkColors : lightColors,
    isDark: theme === 'dark',
    setTheme,
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export type { ThemeColors, ThemeName };