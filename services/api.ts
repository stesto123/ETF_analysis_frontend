import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  QueryParams,
  GeographyGroup,
  GeographyResponse,
  TickerSummary,
  PriceHistoryResponse,
  TickerPriceSeries,
  PricePoint,
} from '@/types';
import { getClerkToken } from '@/utils/clerkToken';

const API_BASE_URL = 'https://etf-analysis-wa-befhb2gng3ejhchz.italynorth-01.azurewebsites.net'
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
  // ------- Auth header helper -------
  private async withAuth(headers: Record<string, string> = {}): Promise<Record<string, string>> {
    try {
      const token = await getClerkToken();
      if (token) {
        // Debug logging of the token when it's attached to the request
        const dbg = process.env.EXPO_PUBLIC_LOG_AUTH_TOKEN?.toLowerCase();
        if (dbg === 'full' || dbg === 'true' || dbg === '1') {
          const shown = dbg === 'full' ? token : `${token.slice(0, 12)}...${token.slice(-6)}`;
          console.log('[auth] Attaching Authorization Bearer token:', shown);
        }
        return { ...headers, Authorization: `Bearer ${token}` };
      }
      // Only log missing token if debug flag explicitly asks for it
      if (process.env.EXPO_PUBLIC_LOG_AUTH_TOKEN?.toLowerCase() === 'full') {
        console.warn('[auth] No token found');
      }
    } catch (error) {
      console.error('[auth] Error getting token:', error);
    }
    return headers;
  }
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

  // ------- Price history (nuovo endpoint) -------
  private buildPriceCacheKey(tickerIds: number[], start?: string | number, end?: string | number): string {
    const idsKey = tickerIds.slice().sort((a, b) => a - b).join(',');
    const startKey = start != null ? String(start) : 'any';
    const endKey = end != null ? String(end) : 'any';
    return `price_history_${idsKey}_${startKey}_${endKey}`;
  }

  async fetchETFData(
    params: { tickerIds: number[]; startCalendarId?: string | number; endCalendarId?: string | number; startDate?: string; endDate?: string },
    useCache: boolean = true
  ): Promise<TickerPriceSeries[]> {
    const validIds = Array.isArray(params.tickerIds)
      ? params.tickerIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : [];
    if (validIds.length === 0) return [];

    const startCal: string | number | undefined =
      params.startCalendarId ?? params.startDate ?? undefined;
    const endCal: string | number | undefined =
      params.endCalendarId ?? params.endDate ?? undefined;
    const cacheKey = this.buildPriceCacheKey(validIds, startCal, endCal);

    if (useCache) {
      const cached = await this.getCache<TickerPriceSeries[]>(cacheKey, 60 * 60 * 1000); // 1h
      if (cached) return cached;
    }

    const url = new URL('/api/data/prices', API_BASE_URL);
    validIds.forEach((id) => url.searchParams.append('ticker_id', String(id)));
    if (startCal != null) url.searchParams.append('start_calendar_id', String(startCal));
    if (endCal != null) url.searchParams.append('end_calendar_id', String(endCal));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.withAuth({ Accept: 'application/json' }),
    });

    if (!response.ok) {
      const txt = await response.text().catch(() => '');
      throw new Error(`Failed to fetch price history (${response.status}): ${txt}`);
    }

    const body: PriceHistoryResponse | null = await response
      .json()
      .catch(() => null);
    if (!body || !Array.isArray(body.items)) {
      return [];
    }

    const items: TickerPriceSeries[] = body.items
      .map((series) => {
        const tickerId = Number(series.ticker_id);
        if (!Number.isFinite(tickerId)) return null;
        const points: PricePoint[] = Array.isArray(series.points)
          ? series.points
              .map((point) => {
                if (!point || typeof point !== 'object') return null;
                const calendar = Number((point as any).calendar_id);
                const close = Number((point as any).close_price);
                if (!Number.isFinite(calendar) || !Number.isFinite(close)) return null;
                const volumeRaw = (point as any).volume;
                const volumeNumber = volumeRaw == null ? null : Number(volumeRaw);
                const volume = volumeNumber != null && Number.isFinite(volumeNumber) ? volumeNumber : null;
                return { calendar_id: calendar, close_price: close, volume };
              })
              .filter((p): p is PricePoint => p != null)
          : [];
        return { ticker_id: tickerId, points };
      })
      .filter((item): item is TickerPriceSeries => item != null);

    await this.setCache(cacheKey, items);
    return items;
  }

  // ------- Geografie & tickers (nuovo endpoint) -------
  async getGeographies(useCache: boolean = true): Promise<GeographyGroup[]> {
    const cacheKey = 'geographies_all_v2';
    if (useCache) {
      const cached = await this.getCache<GeographyGroup[]>(cacheKey, 6 * 60 * 60 * 1000); // 6h
      if (cached) return cached;
    }

    const url = new URL('/api/data/geographies', API_BASE_URL);
    const res = await fetch(url.toString(), {
      headers: await this.withAuth({ Accept: 'application/json' }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Failed to fetch geographies (${res.status}): ${txt}`);
    }

    const body: GeographyResponse | null = await res
      .json()
      .catch(() => null);
    if (!body || !Array.isArray(body.items)) {
      throw new Error('Invalid geographies response format');
    }

    const items: GeographyGroup[] = body.items.map((group) => {
      const rawId = Number(group.geography_id);
      const geography_id = Number.isFinite(rawId) ? rawId : -1;
      const geography_name = String(group.geography_name ?? '');
      const continent = typeof group.continent === 'string' ? group.continent.trim() : null;
      const country = typeof group.country === 'string' ? group.country.trim() : null;
      const isoRaw = typeof group.iso_code === 'string' ? group.iso_code.trim() : null;
      const iso_code = isoRaw ? isoRaw.toUpperCase() : null;

      const tickers: TickerSummary[] = Array.isArray(group.tickers)
        ? group.tickers
            .map((t) => {
              if (!t || typeof t !== 'object') return null;
              const ticker_id = Number((t as any).ticker_id);
              if (!Number.isFinite(ticker_id)) return null;
              const symbol = typeof t.symbol === 'string' ? t.symbol : '';
              const name = typeof t.name === 'string' ? t.name : undefined;
              const asset_class = typeof t.asset_class === 'string' ? t.asset_class : undefined;
              return { ticker_id, symbol, name, asset_class } as TickerSummary;
            })
            .filter((t): t is TickerSummary => t != null)
        : [];

      return { geography_id, geography_name, continent, country, iso_code, tickers };
    });

    await this.setCache(cacheKey, items);
    return items;
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

  const res = await fetch(url.toString(), { headers: await this.withAuth({ Accept: 'application/json' }) });
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

  const res = await fetch(url.toString(), { headers: await this.withAuth({ Accept: 'application/json' }) });
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
  k === 'geographies_all_v1' ||
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
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
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
  const res = await fetch(url.toString(), { headers: await this.withAuth({ Accept: 'application/json' }) });
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
  const res = await fetch(url.toString(), { headers: await this.withAuth({ Accept: 'application/json' }) });
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
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
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
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
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
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
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
  const res = await fetch(url, { method: 'DELETE', headers: await this.withAuth({ Accept: 'application/json' }) });
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
export type { GeographyGroup, TickerSummary, PortfolioResultRow, CreatePortfolioResponse };