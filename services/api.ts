import AsyncStorage from '@react-native-async-storage/async-storage';
import { ETFData, APIError, QueryParams } from '@/types';

const API_BASE_URL = 'https://wa-etf-analysis-d0enavd0h5e9f5gr.italynorth-01.azurewebsites.net'

type GeographicArea = { area_geografica: string; id_area_geografica: number };
type AreaTicker = { ID_ticker: number; ticker: string; nome: string };
type PortfolioItem = { [key: string]: any };
type PortfolioResultRow = {
  calendar_id: number;
  id_portafoglio: number;
  valore_investimento: number;
  plusvalenze: number;
  valore_totale: number;
  id_strategia: number;
};
type CreatePortfolioResponse = { ID_Portafoglio: number; Descrizione_Portafoglio: string };
type CompositionItemPost = { ID_ticker?: number; ticker?: string; percentuale: number | string };

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

  async getTickersByArea(
    id_area_geografica: number,
    flag_is_needed: boolean = true,
    useCache: boolean = true
  ): Promise<AreaTicker[]> {
    // bump cache version to invalidate old entries without 'nome'
    const cacheKey = `tickers_area_${id_area_geografica}_flag_${flag_is_needed}_v2`;
    if (useCache) {
      const cached = await this.getCache<AreaTicker[]>(cacheKey, 6 * 60 * 60 * 1000); // 6h
      if (cached) {
        const hasNames = Array.isArray(cached) && cached.every((t) => t && typeof (t as any).nome === 'string');
        if (hasNames) return cached;
        // fall through to refetch if old cache missing 'nome'
      }
    }

    const url = new URL('/api/tickers_by_area', API_BASE_URL);
    url.searchParams.append('id_area_geografica', String(id_area_geografica));
    if (flag_is_needed) {
      url.searchParams.append('flag_is_needed', '1');
    }
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Failed to fetch tickers by area: ${res.status}`);
    const raw = await res.json();
    // normalize to ensure nome exists even if backend lacks it
    const data: AreaTicker[] = Array.isArray(raw)
      ? raw.map((t: any) => ({ ID_ticker: t.ID_ticker, ticker: t.ticker, nome: typeof t.nome === 'string' ? t.nome : t.ticker }))
      : [];
    await this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Fetch portfolio composition(s).
   * If id_portafoglio is provided returns composition for that portfolio (as array, possibly empty).
   * Otherwise returns all portfolios.
   */
  async getPortfolioComposition(id_portafoglio?: number, useCache: boolean = true): Promise<PortfolioItem[]> {
    const cacheKey = id_portafoglio == null ? 'portfolios_all' : `portfolios_${id_portafoglio}`;
    if (useCache) {
      const cached = await this.getCache<PortfolioItem[]>(cacheKey, 60 * 60 * 1000); // 1h
      if (cached) return cached;
    }

    const url = new URL('/api/composizione_portafoglio', API_BASE_URL);
    if (id_portafoglio != null) url.searchParams.append('id_portafoglio', String(id_portafoglio));

    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to fetch portfolio composition (${res.status}): ${txt}`);
    }
    const data: PortfolioItem[] = await res.json();
    if (!Array.isArray(data)) throw new Error('Invalid portfolio response format');
    await this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Fetch cumulative returns for an ETF (returns arrays: calendar_days, simple_cum, log_cum)
   */
  async fetchCumulativeReturns(
    params: QueryParams,
    useCache: boolean = true
  ): Promise<{ calendar_days: number[]; simple: number[]; log: number[]; name?: string }>
  {
    const cacheKey = `cum_returns_${params.id_ticker}_${params.start_date}_${params.end_date}`;
    if (useCache) {
      const cached = await this.getCache<{ calendar_days: number[]; simple: number[]; log: number[]; name?: string }>(cacheKey, 60 * 60 * 1000); // 1h
      if (cached) return cached;
    }

    const url = new URL('/api/cumulative_returns', API_BASE_URL);
    url.searchParams.append('id_ticker', params.id_ticker.toString());
    url.searchParams.append('start_date', params.start_date);
    url.searchParams.append('end_date', params.end_date);

    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Failed to fetch cumulative returns: ${res.status}`);
    const body = await res.json();

    // backend may return a tuple/array
    // old: [calendar_days, simple_cum, log_cum]
    // new: [calendar_days, names, simple_cum, log_cum]
    if (Array.isArray(body)) {
      if (body.length >= 4) {
        const calendar_days = Array.isArray(body[0]) ? body[0].map((v: any) => Number(v)) : [];
        const namesArr = Array.isArray(body[1]) ? body[1].map((v: any) => String(v)) : [];
        const simple = Array.isArray(body[2]) ? body[2].map((v: any) => Number(v)) : [];
        const log = Array.isArray(body[3]) ? body[3].map((v: any) => Number(v)) : [];
        const name = namesArr.find((n: string) => n && n.trim().length > 0);
        const out = { calendar_days, simple, log, name };
        await this.setCache(cacheKey, out);
        return out;
      }
      if (body.length >= 3) {
        const calendar_days = Array.isArray(body[0]) ? body[0].map((v: any) => Number(v)) : [];
        const simple = Array.isArray(body[1]) ? body[1].map((v: any) => Number(v)) : [];
        const log = Array.isArray(body[2]) ? body[2].map((v: any) => Number(v)) : [];
        const out = { calendar_days, simple, log };
        await this.setCache(cacheKey, out);
        return out;
      }
    }

    // or an object { calendar_days: [...], simple: [...], log: [...], name?: string }
    if (body && typeof body === 'object') {
      const calendar_days = Array.isArray((body as any).calendar_days) ? (body as any).calendar_days.map((v: any) => Number(v)) : [];
      const simple = Array.isArray((body as any).simple) ? (body as any).simple.map((v: any) => Number(v)) : [];
      const log = Array.isArray((body as any).log) ? (body as any).log.map((v: any) => Number(v)) : [];
      const name = typeof (body as any).name === 'string' ? (body as any).name : undefined;
      const out = { calendar_days, simple, log, name };
      await this.setCache(cacheKey, out);
      return out;
    }

    throw new Error('Invalid cumulative returns response format');
  }

  // ------- Utility -------
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter((k) =>
        k.startsWith('etf_data_') ||
        k === 'areas_all' ||
        k.startsWith('tickers_area_') ||
        k.startsWith('cum_returns_') ||
        k === 'portfolios_all' ||
        k.startsWith('portfolios_') ||
        k === 'portfolio_results_all' ||
        k.startsWith('portfolio_results_')
      );
      if (keysToRemove.length) await AsyncStorage.multiRemove(keysToRemove);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  // ------- Pipeline job -------
  async runPipeline(params: { id_portafoglio: number; ammontare: number; strategia: string; data_inizio: string; data_fine: string; capitale_iniziale?: number }): Promise<{ job_id: string; status: string; pid?: number; log_path?: string }> {
    const payload = { ...params } as any;
    if (payload.capitale_iniziale == null) payload.capitale_iniziale = 0;
    const res = await fetch(`${API_BASE_URL}/api/run_pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to start pipeline (${res.status}): ${txt}`);
    }
    return res.json();
  }

  async getJobStatus(job_id: string): Promise<{ job_id: string; status: string; exit_code?: number | null; log_path?: string; finished_at?: number; started_at?: number }> {
    const url = new URL('/api/job_status', API_BASE_URL);
    url.searchParams.append('job_id', job_id);
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to get job status (${res.status}): ${txt}`);
    }
    return res.json();
  }

  /** Fetch risultati_portafoglio (optionally filtered) */
  async getPortfolioResults(id_portafoglio?: number, useCache: boolean = true): Promise<PortfolioResultRow[]> {
    const cacheKey = id_portafoglio == null ? 'portfolio_results_all' : `portfolio_results_${id_portafoglio}`;
    if (useCache) {
      const cached = await this.getCache<PortfolioResultRow[]>(cacheKey, 30 * 60 * 1000); // 30m
      if (cached) return cached;
    }
    const url = new URL('/api/risultati_portafoglio', API_BASE_URL);
    if (id_portafoglio != null) url.searchParams.append('id_portafoglio', String(id_portafoglio));
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Failed to fetch portfolio results: ${res.status}`);
    const data: PortfolioResultRow[] = await res.json();
    await this.setCache(cacheKey, data);
    return data;
  }

  // ------- Portfolio management (create/update) -------
  /**
   * Backend supports creating/updating a portfolio and its composition in a single call:
   * POST /api/portafogli with body { descrizione_portafoglio, composizione: [{ ID_ticker|ticker, percentuale }] }
   */
  async savePortfolioWithComposition(payload: { descrizione_portafoglio: string; composizione: CompositionItemPost[] }): Promise<any> {
    const url = `${API_BASE_URL}/api/portafogli`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to save portfolio ${url} (${res.status}): ${txt}`);
    }
    const data = await res.json().catch(() => ({ ok: true }));
    // Invalidate portfolios caches
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter((k) => k === 'portfolios_all' || k.startsWith('portfolios_'));
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    } catch {}
    return data;
  }

  async createPortfolio(descrizione: string): Promise<CreatePortfolioResponse> {
    const url = `${API_BASE_URL}/api/portafoglio`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ descrizione }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to create portfolio ${url} (${res.status}): ${txt}`);
    }
    const data = await res.json();
    // invalidate cache of portfolios
    try {
      await AsyncStorage.multiRemove(['portfolios_all']);
    } catch {}
    return data as CreatePortfolioResponse;
  }

  async setPortfolioComposition(
    id_portafoglio: number,
    items: Array<{ ID_ticker: number; percentuale: number }>,
    descrizione?: string
  ): Promise<{ ok: true } | any> {
    const url = `${API_BASE_URL}/api/composizione_portafoglio`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id_portafoglio, items, descrizione }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to set composition ${url} (${res.status}): ${txt}`);
    }
    const data = await res.json().catch(() => ({ ok: true }));
    // invalidate caches related to portfolios
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter((k) => k === 'portfolios_all' || k.startsWith('portfolios_'));
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    } catch {}
    return data;
  }

  /** Delete a portfolio and its composition */
  async deletePortfolio(id_portafoglio: number): Promise<{ ok: true } | any> {
    // Prefer DELETE with query string; fallback to /api/portafogli/:id if needed
    const tryUrls = [
      `${API_BASE_URL}/api/portafogli?id_portafoglio=${encodeURIComponent(String(id_portafoglio))}`,
      `${API_BASE_URL}/api/portafogli/${encodeURIComponent(String(id_portafoglio))}`,
    ];

    let lastErr: string | null = null;
    for (const url of tryUrls) {
      try {
        const res = await fetch(url, { method: 'DELETE', headers: { Accept: 'application/json' } });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status} ${txt}`);
        }
        const data = await res.json().catch(() => ({ ok: true }));
        // Invalidate portfolio and results caches
        try {
          const keys = await AsyncStorage.getAllKeys();
          const toRemove = keys.filter((k) =>
            k === 'portfolios_all' ||
            k.startsWith('portfolios_') ||
            k === 'portfolio_results_all' ||
            k.startsWith('portfolio_results_')
          );
          if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
        } catch {}
        return data;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }
    throw new Error(`Failed to delete portfolio id=${id_portafoglio}: ${lastErr ?? 'unknown error'}`);
  }
}

export const apiService = new APIService();
export type { GeographicArea, AreaTicker, PortfolioResultRow, CreatePortfolioResponse };