import AsyncStorage from '@react-native-async-storage/async-storage';
import { ETFData, APIError, QueryParams } from '@/types';

const API_BASE_URL = 'https://wa-etf-analysis-d0enavd0h5e9f5gr.italynorth-01.azurewebsites.net';

class APIService {
  private async getCacheKey(params: QueryParams): Promise<string> {
    return `etf_data_${params.id_ticker}_${params.start_date}_${params.end_date}`;
  }

  private async getCachedData(cacheKey: string): Promise<ETFData[] | null> {
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        // Check if cache is less than 1 hour old
        const cacheTime = parsed.timestamp;
        const now = new Date().getTime();
        const oneHour = 60 * 60 * 1000;
        
        if (now - cacheTime < oneHour) {
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn('Failed to get cached data:', error);
    }
    return null;
  }

  private async setCachedData(cacheKey: string, data: ETFData[]): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: new Date().getTime()
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  async fetchETFData(params: QueryParams, useCache: boolean = true): Promise<ETFData[]> {
    const cacheKey = await this.getCacheKey(params);
    
    // Try to get cached data first
    if (useCache) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    try {
      const url = new URL('/api/dati', API_BASE_URL);
      url.searchParams.append('id_ticker', params.id_ticker.toString());
      url.searchParams.append('start_date', params.start_date);
      url.searchParams.append('end_date', params.end_date);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ETFData[] = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected array');
      }

      // Cache the data
      await this.setCachedData(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to fetch ETF data: ${error.message}`);
      }
      
      throw new Error('Failed to fetch ETF data: Unknown error');
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const etfDataKeys = keys.filter(key => key.startsWith('etf_data_'));
      await AsyncStorage.multiRemove(etfDataKeys);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
}

export const apiService = new APIService();