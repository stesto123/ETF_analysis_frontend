import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
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

const DEFAULT_API_BASE_URL = 'https://etf-analysis-wa-befhb2gng3ejhchz.italynorth-01.azurewebsites.net';
const configExtra = Constants.expoConfig?.extra as { apiBaseUrl?: string; apiTarget?: string } | undefined;
const CONFIG_API_BASE_URL = configExtra?.apiBaseUrl;

function resolveDevHost(): string | null {
  const expoConfigHost = Constants.expoConfig?.hostUri;
  if (expoConfigHost) {
    return expoConfigHost.split(':')[0];
  }
  // Legacy manifest properties in Expo Go / dev mode
  const legacyDebuggerHost = (Constants as any).manifest?.debuggerHost as string | undefined;
  if (legacyDebuggerHost) {
    return legacyDebuggerHost.split(':')[0];
  }
  const manifest2Host = (Constants as any).manifest2?.extra?.expoGo?.developer?.host as string | undefined;
  if (manifest2Host) {
    return manifest2Host.split(':')[0];
  }
  return null;
}

function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  const needsLocalRewrite = baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost');
  if (!needsLocalRewrite) {
    return baseUrl;
  }

  // Expo Go / web dev server host
  const host = resolveDevHost();
  if (host) {
    return baseUrl.replace('127.0.0.1', host).replace('localhost', host);
  }

  if (Platform.OS === 'android') {
    // Android emulator special loopback
    return baseUrl.replace('127.0.0.1', '10.0.2.2').replace('localhost', '10.0.2.2');
  }

  return baseUrl;
}

const RAW_API_BASE_URL = CONFIG_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
const API_BASE_URL = normalizeBaseUrl(RAW_API_BASE_URL);

if (__DEV__) {
  console.log('[api] Base URL:', API_BASE_URL, '(from target:', configExtra?.apiTarget ?? 'default', ')');
}
type ChatCompletionMessage = {
  role: 'assistant' | 'user' | 'system';
  content: string;
};
type ChatCompletionRequest = {
  messages: ChatCompletionMessage[];
  conversation_id?: string | null;
  stream?: boolean;
  model?: string;
  temperature?: number;
};
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
        // Rimosso log del token
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

  // ------- User profile sync -------
  async ensureUserProfile(payload: { email?: string | null; username?: string | null }): Promise<void> {
    const email = payload.email?.trim() ?? null;
    let username = payload.username?.trim() ?? null;
    if (!username && email) {
      username = email.split('@')[0] || email;
    }

    const res = await fetch(`${API_BASE_URL}/api/users/sync`, {
      method: 'POST',
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({
        email,
        username,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Failed to sync user profile (${res.status}): ${txt}`);
    }
  }

  // ------- Chat completions -------
  async createChatCompletion(payload: ChatCompletionRequest): Promise<ChatCompletionMessage> {
    const url = `${API_BASE_URL}/api/chat/complete`;
    const res = await fetch(url, {
      method: 'POST',
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify(payload),
    });

    const raw = await res.text().catch(() => '');
    let body: any = null;
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = null;
      }
    }

    if (!res.ok) {
      const detail = typeof body?.detail === 'string' ? body.detail : raw;
      throw new Error(`Chat backend error ${res.status}${detail ? `: ${detail}` : ''}`);
    }

    const messageCandidate = body?.message ?? body?.choices?.[0]?.message ?? body;
    let content: string | undefined;
    if (typeof messageCandidate?.content === 'string') {
      content = messageCandidate.content.trim();
    } else if (typeof messageCandidate === 'string') {
      content = messageCandidate.trim();
    } else if (raw) {
      content = raw.trim();
    }
    const role = typeof messageCandidate?.role === 'string' ? messageCandidate.role : 'assistant';

    if (!content) {
      throw new Error('Chat backend response missing content');
    }

    return { role: role === 'user' ? 'assistant' : role, content };
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

  /**
   * Fetch price history and cumulative returns for ETF(s).
   * Ogni point ora include anche simple_return (ignora log_return).
   * La struttura attesa è:
   * {
   *   items: [
   *     {
   *       ticker_id: number,
   *       points: [
   *         {
   *           calendar_id: number,
   *           close_price: number,
   *           volume: number | null,
   *           simple_return: number | null
   *         }, ...
   *       ]
   *     }, ...
   *   ]
   * }
   */
  async fetchETFData(
    params: { tickerIds: number[]; startCalendarId?: string | number; endCalendarId?: string | number; startDate?: string; endDate?: string },
    useCache: boolean = true
  ): Promise<Array<{ ticker_id: number; points: Array<{ calendar_id: number; close_price: number; volume: number | null; simple_return: number | null }> }>> {
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
      const cached = await this.getCache<any>(cacheKey, 60 * 60 * 1000); // 1h
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

    const body = await response.json().catch(() => null);
    if (!body || !Array.isArray(body.items)) {
      return [];
    }

    // Mappa la nuova struttura, includendo simple_return e ignorando log_return
    const items = body.items.map((series: any) => {
      const tickerId = Number(series.ticker_id);
      if (!Number.isFinite(tickerId)) return null;
      const points = Array.isArray(series.points)
        ? series.points.map((point: any) => {
            if (!point || typeof point !== 'object') return null;
            const calendar = Number(point.calendar_id);
            const close = Number(point.close_price);
            if (!Number.isFinite(calendar) || !Number.isFinite(close)) return null;
            const volumeRaw = point.volume;
            const volumeNumber = volumeRaw == null ? null : Number(volumeRaw);
            const volume = volumeNumber != null && Number.isFinite(volumeNumber) ? volumeNumber : null;
            const cumulative_return = point.cumulative_return != null && !isNaN(Number(point.cumulative_return)) ? Number(point.cumulative_return) : 0;
            return { calendar_id: calendar, close_price: close, volume, cumulative_return };
          }).filter((p: any) => p != null)
        : [];
      return { ticker_id: tickerId, points };
    }).filter((item: any) => item != null);

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
  /**
   * Crea un nuovo portafoglio e la sua composizione usando i nuovi endpoint.
   * Prima crea il portafoglio, poi la composizione con il bulk endpoint.
   */
  async savePortfolioWithComposition(payload: { name: string; compositions: Array<{ ticker_id: number; weight: number }>; user_id?: number }): Promise<any> {
    // 1. Crea il portafoglio
    const urlPortfolio = `${API_BASE_URL}/api/portfolios`;
    const resPortfolio = await fetch(urlPortfolio, {
      method: 'POST',
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ name: payload.name, user_id: payload.user_id }),
    });
    if (!resPortfolio.ok) {
      const txt = await resPortfolio.text();
      throw new Error(`Failed to create portfolio ${urlPortfolio} (${resPortfolio.status}): ${txt}`);
    }
    const portfolio = await resPortfolio.json();
    const portfolio_id = portfolio.id || portfolio.portfolio_id;
    if (!portfolio_id) throw new Error('Portfolio creation did not return an id');

    // 2. Crea la composizione con il bulk endpoint
    const urlComp = new URL(`${API_BASE_URL}/api/portfolios/composition/bulk`);
    if (payload.user_id != null) urlComp.searchParams.append('user_id', String(payload.user_id));
    const compositions = payload.compositions.map(c => ({ portfolio_id, ticker_id: c.ticker_id, weight: c.weight }));
    const resComp = await fetch(urlComp.toString(), {
      method: 'POST',
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ compositions }),
    });
    if (!resComp.ok) {
      const txt = await resComp.text();
      throw new Error(`Failed to set composition (bulk) ${urlComp} (${resComp.status}): ${txt}`);
    }
    const compData = await resComp.json();
    // Invalidate portfolios caches
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter((k) => k === 'portfolios_all' || k.startsWith('portfolios_'));
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    } catch {}
    return { portfolio, composition: compData };
  }

  /**
   * Crea un nuovo portafoglio usando il nuovo endpoint.
   */
  async createPortfolio(name: string, user_id?: number): Promise<any> {
    const url = `${API_BASE_URL}/api/portfolios`;
    const res = await fetch(url, {
      method: 'POST',
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ name, user_id }),
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
    return data;
  }

  /**
   * Imposta la composizione di un portafoglio tramite bulk endpoint.
   * compositions: array di { portfolio_id, ticker_id, weight }
   * user_id: opzionale, se richiesto dal backend
   */
  async setPortfolioComposition(
    compositions: Array<{ portfolio_id: number; ticker_id: number; weight: number }>,
    user_id?: number
  ): Promise<any> {
    const url = new URL(`${API_BASE_URL}/api/portfolios/composition/bulk`);
    if (user_id != null) url.searchParams.append('user_id', String(user_id));
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ compositions }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to set composition (bulk) ${url} (${res.status}): ${txt}`);
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
      console.error(`[API ERROR] deletePortfolio: Failed to delete portfolio id=${id_portafoglio}: ${lastErr ?? 'unknown error'}`);
    throw new Error(`Failed to delete portfolio id=${id_portafoglio}: ${lastErr ?? 'unknown error'}`);
  }
}

export const apiService = new APIService();
export type { GeographyGroup, TickerSummary, PortfolioResultRow, CreatePortfolioResponse, ChatCompletionMessage };