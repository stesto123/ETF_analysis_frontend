import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChartSettingsContextValue {
  maxPoints: number;
  setMaxPoints: (n: number) => void;
  loading: boolean;
}

const ChartSettingsContext = createContext<ChartSettingsContextValue | undefined>(undefined);

const STORAGE_KEY = 'chart:maxPoints';
const DEFAULT_MAX_POINTS = 60;
const MIN_POINTS = 10;
const MAX_POINTS = 500; // hard upper safety cap

export const ChartSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [maxPoints, setMaxPointsState] = useState<number>(DEFAULT_MAX_POINTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && raw) {
          const parsed = parseInt(raw, 10);
            if (Number.isFinite(parsed)) {
              setMaxPointsState(normalize(parsed));
            }
        }
      } catch {
        // ignore read errors
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const normalize = (v: number) => {
    if (!Number.isFinite(v)) return DEFAULT_MAX_POINTS;
    return Math.min(MAX_POINTS, Math.max(MIN_POINTS, Math.round(v)));
  };

  const setMaxPoints = useCallback((n: number) => {
    const norm = normalize(n);
    setMaxPointsState(norm);
    AsyncStorage.setItem(STORAGE_KEY, String(norm)).catch(() => {});
  }, []);

  return (
    <ChartSettingsContext.Provider value={{ maxPoints, setMaxPoints, loading }}>
      {children}
    </ChartSettingsContext.Provider>
  );
};

export function useChartSettings() {
  const ctx = useContext(ChartSettingsContext);
  if (!ctx) throw new Error('useChartSettings must be used within ChartSettingsProvider');
  return ctx;
}

export const CHART_MAX_POINTS_LIMITS = { MIN: MIN_POINTS, MAX: MAX_POINTS, DEFAULT: DEFAULT_MAX_POINTS };
