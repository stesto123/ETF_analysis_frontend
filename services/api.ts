import AsyncStorage from '@react-native-async-storage/async-storage';
import { ETFData, APIError, QueryParams } from '@/types';

const API_BASE_URL = 'https://wa-etf-analysis-d0enavd0h5e9f5gr.italynorth-01.azurewebsites.net';

type GeographicArea = { area_geografica: string; id_area_geografica: number };
type AreaTicker = { ID_ticker: number; ticker: string };

class APIService {
  // ------- Cache helpers (generic) -------
  private async getCache<T>(key: string, ttlMs: number): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const now = Date.now();
      if (now - parsed.timestamp < ttlMs) return parsed.data as T;
    } catch (e) {
      console.warn('Cache read failed:', e);
    }
    return null;
  }

  private async setCache<T>(key: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(
        key,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch (e) {
      console.warn('Cache write failed:', e);
    }
  }

  // ------- ETF data (già presente) -------
  private async getETFCacheKey(params: QueryParams): Promise<string> {
    return `etf_data_${params.id_ticker}_${params.start_date}_${params.end_date}`;
  }

  async fetchETFData(params: QueryParams, useCache: boolean = true): Promise<ETFData[]> {
    const cacheKey = await this.getETFCacheKey(params);

    if (useCache) {
      const cached = await this.getCache<ETFData[]>(cacheKey, 60 * 60 * 1000); // 1h
      if (cached) return cached;
    }

    try {
      const url = new URL('/api/dati', API_BASE_URL);
      url.searchParams.append('id_ticker', params.id_ticker.toString());
      url.searchParams.append('start_date', params.start_date);
      url.searchParams.append('end_date', params.end_date);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ETFData[] = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid response format: expected array');

      await this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      if (error instanceof Error) throw new Error(`Failed to fetch ETF data: ${error.message}`);
      throw new Error('Failed to fetch ETF data: Unknown error');
    }
  }

  // ------- NUOVI METODI: aree & tickers -------
  async getGeographicAreas(useCache: boolean = true): Promise<GeographicArea[]> {
    const cacheKey = 'areas_all';
    if (useCache) {
      const cached = await this.getCache<GeographicArea[]>(cacheKey, 24 * 60 * 60 * 1000); // 24h
      if (cached) return cached;
    }

    const url = new URL('/api/aree_geografiche', API_BASE_URL);
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Failed to fetch areas: ${res.status}`);
    const data: GeographicArea[] = await res.json();
    await this.setCache(cacheKey, data);
    return data;
  }

  async getTickersByArea(id_area_geografica: number, useCache: boolean = true): Promise<AreaTicker[]> {
    const cacheKey = `tickers_area_${id_area_geografica}`;
    if (useCache) {
      const cached = await this.getCache<AreaTicker[]>(cacheKey, 6 * 60 * 60 * 1000); // 6h
      if (cached) return cached;
    }

    const url = new URL('/api/tickers_by_area', API_BASE_URL);
    url.searchParams.append('id_area_geografica', String(id_area_geografica));
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Failed to fetch tickers by area: ${res.status}`);
    const data: AreaTicker[] = await res.json();
    await this.setCache(cacheKey, data);
    return data;
  }

  // ------- Utility -------
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter(
        (k) => k.startsWith('etf_data_') || k === 'areas_all' || k.startsWith('tickers_area_')
      );
      if (keysToRemove.length) await AsyncStorage.multiRemove(keysToRemove);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
}

export const apiService = new APIService();
export type { GeographicArea, AreaTicker };