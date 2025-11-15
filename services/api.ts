import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  QueryParams,
  GeographyGroup,
  GeographyResponse,
  GeographyResponseItem,
  GeographyResponseTicker,
  TickerSummary,
  PriceHistoryResponse,
  TickerPriceSeries,
  PricePoint,
  PortfolioSummary,
  PortfolioSummaryResponse,
  PortfolioCompositionResponse,
  PortfolioCompositionEntry,
  UserProfile,
  PortfolioDeleteResponse,
  SimulationStrategy,
  SimulationStrategyResponse,
  SimulationRunPayload,
  SimulationRunResponse,
  SimulationAggregatePoint,
  SimulationAggregateSeries,
  SimulationAggregateResultsResponse,
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
type CreatePortfolioResponse = { ID_Portafoglio: number; Descrizione_Portafoglio: string };
type CompositionItemPost = { ID_ticker?: number; ticker?: string; percentuale: number | string };

class HTTPError extends Error {
  status?: number;
  body?: string;

  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = 'HTTPError';
    this.status = status;
    this.body = body;
  }
}

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
  async ensureUserProfile(payload: { email?: string | null; username?: string | null }): Promise<number | null> {
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
    const raw = await res.text().catch(() => '');
    if (!res.ok) {
      throw new Error(`Failed to sync user profile (${res.status}): ${raw}`);
    }
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const candidate =
        parsed?.user_id ??
        parsed?.id ??
        parsed?.user?.user_id ??
        parsed?.user?.id ??
        null;
      const numeric = candidate != null ? Number(candidate) : null;
      if (numeric != null && Number.isFinite(numeric)) {
        return numeric;
      }
    } catch {
      // ignore JSON parse errors; backend may not return body
    }
    return null;
  }

  async getCurrentUserProfile(): Promise<UserProfile> {
    const url = `${API_BASE_URL}/api/users/me`;
    const res = await fetch(url, {
      method: 'GET',
      headers: await this.withAuth({ Accept: 'application/json', 'Content-Type': 'application/json' }),
    });

    const textBody = await res.text().catch(() => '');
    if (!res.ok) {
      const errorMessage = textBody || res.statusText || 'Profile fetch failed';
      throw new HTTPError(errorMessage, res.status, textBody);
    }

    let parsed: any = null;
    try {
      parsed = textBody ? JSON.parse(textBody) : {};
    } catch (error) {
      throw new HTTPError('Invalid profile response JSON', res.status, textBody);
    }
    if (typeof parsed !== 'object' || parsed === null) {
      throw new HTTPError('Profile response is not an object', res.status, textBody);
    }

    const userId = Number(parsed.user_id);
    if (!Number.isFinite(userId)) {
      throw new HTTPError('Profile response missing user_id', res.status, textBody);
    }

    return {
      user_id: userId,
      username: parsed.username ?? null,
      email: parsed.email ?? null,
      created_at: parsed.created_at ?? null,
      last_login: parsed.last_login ?? null,
      subscription_id: parsed.subscription_id != null ? Number(parsed.subscription_id) : null,
      clerk_user_id: parsed.clerk_user_id ?? null,
    } as UserProfile;
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

  private async invalidatePortfolioCachesForUser(userId?: number): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter((k) => {
        if (k === 'portfolios_all' || k.startsWith('portfolios_') || k.startsWith('portfolio_results_')) {
          return true;
        }
        if (k.startsWith('portfolios_user_')) {
          if (userId == null) return true;
          return k === `portfolios_user_${userId}`;
        }
        if (k.startsWith('portfolio_comp_')) {
          if (userId == null) return true;
          return k.endsWith(`_${userId}`) || k.includes(`_${userId}_`);
        }
        return false;
      });
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    } catch (error) {
      console.warn('Cache invalidation failed:', error);
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
  * Ogni point ora include anche cumulative_return (ignora log_return).
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
  *           cumulative_return: number | null
   *         }, ...
   *       ]
   *     }, ...
   *   ]
   * }
   */
  async fetchETFData(
    params: { tickerIds: number[]; startCalendarId?: string | number; endCalendarId?: string | number; startDate?: string; endDate?: string },
    useCache: boolean = true
  ): Promise<Array<{ ticker_id: number; points: PricePoint[] }>> {
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

  // Mappa la nuova struttura, includendo cumulative_return e ignorando log_return
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
            const cumulative_return =
              point.cumulative_return != null && !isNaN(Number(point.cumulative_return))
                ? Number(point.cumulative_return)
                : null;
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

    const raw: GeographyResponse | GeographyResponse['items'] | null = await res
      .json()
      .catch(() => null);

    const itemsSource: unknown = Array.isArray((raw as any)?.items)
      ? (raw as any).items
      : Array.isArray(raw)
        ? raw
        : Array.isArray((raw as any)?.data)
          ? (raw as any).data
          : null;

    if (!Array.isArray(itemsSource)) {
      throw new Error('Invalid geographies response format');
    }

    const items: GeographyGroup[] = (itemsSource as unknown[]).map((groupLike) => {
      const group = groupLike as GeographyResponseItem;
      const rawId = Number((group as any)?.geography_id);
      const geography_id = Number.isFinite(rawId) ? rawId : -1;
      const geography_name = String(group.geography_name ?? '');
      const continent = typeof group.continent === 'string' ? group.continent.trim() : null;
      const country = typeof group.country === 'string' ? group.country.trim() : null;
      const isoRaw = typeof group.iso_code === 'string' ? group.iso_code.trim() : null;
      const iso_code = isoRaw ? isoRaw.toUpperCase() : null;

      const tickerItems: GeographyResponseTicker[] = Array.isArray(group.tickers)
        ? group.tickers
        : [];

      const tickers: TickerSummary[] = tickerItems
        .map((tickerLike: GeographyResponseTicker) => {
          if (!tickerLike || typeof tickerLike !== 'object') return null;
          const ticker_id = Number((tickerLike as any).ticker_id);
              if (!Number.isFinite(ticker_id)) return null;
          const symbol = typeof tickerLike.symbol === 'string' ? tickerLike.symbol : '';
          const name = typeof tickerLike.name === 'string' ? tickerLike.name : undefined;
          const asset_class = typeof tickerLike.asset_class === 'string' ? tickerLike.asset_class : undefined;
              return { ticker_id, symbol, name, asset_class } as TickerSummary;
            })
        .filter((entry): entry is TickerSummary => entry != null);

      return { geography_id, geography_name, continent, country, iso_code, tickers };
    });

    await this.setCache(cacheKey, items);
    return items;
  }

  async getPortfolioComposition(portfolioId: number, userId?: number, useCache: boolean = true): Promise<PortfolioCompositionResponse> {
    if (!Number.isFinite(portfolioId)) {
      throw new Error('getPortfolioComposition: portfolioId richiesto');
    }
    const cacheKey = `portfolio_comp_${portfolioId}_${userId ?? 'any'}`;
    if (useCache) {
      const cached = await this.getCache<PortfolioCompositionResponse>(cacheKey, 30 * 60 * 1000); // 30m
      if (cached) return cached;
    }

    const url = new URL(`/api/portfolios/${portfolioId}/composition`, API_BASE_URL);
    if (userId != null) url.searchParams.append('user_id', String(userId));
    const res = await fetch(url.toString(), {
      headers: await this.withAuth({ Accept: 'application/json' }),
    });
    if (!res.ok) {
      const txt = await res.text();
      const errMsg = `[API ERROR] getPortfolioComposition: ${res.status} - ${txt}`;
      console.error(errMsg);
      console.log(errMsg);
      throw new Error(`Failed to fetch portfolio composition (${res.status}): ${txt}`);
    }
    const raw = (await res.json().catch(() => null)) as any;
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) {
      throw new Error('Invalid portfolio composition response format');
    }

    const portfolio_id = Number(raw.portfolio_id);
    const user_id = Number(raw.user_id);
    const items: PortfolioCompositionEntry[] = raw.items
      .map((entry: any) => {
        const composition_id = Number(entry.composition_id);
        const pId = Number(entry.portfolio_id ?? portfolio_id ?? portfolioId);
        const ticker_id = Number(entry.ticker_id);
        const uId = Number(entry.user_id ?? user_id ?? userId);
        const weight = Number(entry.weight);
        if (!Number.isFinite(composition_id) || !Number.isFinite(pId) || !Number.isFinite(ticker_id) || !Number.isFinite(uId)) {
          return null;
        }
        return {
          composition_id,
          portfolio_id: pId,
          ticker_id,
          user_id: uId,
          weight: Number.isFinite(weight) ? weight : 0,
          description: entry.description != null ? String(entry.description) : null,
          created_at: typeof entry.created_at === 'string' ? entry.created_at : '',
        } as PortfolioCompositionEntry;
      })
  .filter((entry: PortfolioCompositionEntry | null): entry is PortfolioCompositionEntry => entry != null);

    const payload: PortfolioCompositionResponse = {
      portfolio_id: Number.isFinite(portfolio_id) ? portfolio_id : portfolioId,
      user_id: Number.isFinite(user_id) ? user_id : userId ?? -1,
      items,
    };

    await this.setCache(cacheKey, payload);
    return payload;
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

  // ------- Simulations -------
  async runSimulation(payload: SimulationRunPayload): Promise<SimulationRunResponse> {
    if (!Number.isFinite(payload.user_id)) {
      throw new Error('runSimulation: user_id is required');
    }
    if (!Number.isFinite(payload.portfolio_id)) {
      throw new Error('runSimulation: portfolio_id is required');
    }
    if (!Number.isFinite(payload.strategy_id)) {
      throw new Error('runSimulation: strategy_id is required');
    }
    if (!Number.isFinite(payload.monthly_investment) || payload.monthly_investment <= 0) {
      throw new Error('runSimulation: monthly_investment must be greater than 0');
    }
    if (payload.initial_capital != null && payload.initial_capital < 0) {
      throw new Error('runSimulation: initial_capital cannot be negative');
    }
    if (
      payload.rebalance_threshold != null &&
      (payload.rebalance_threshold < 0 || payload.rebalance_threshold > 1)
    ) {
      throw new Error('runSimulation: rebalance_threshold must be between 0 and 1');
    }

    const body: Record<string, any> = {
      user_id: Number(payload.user_id),
      portfolio_id: Number(payload.portfolio_id),
      strategy_id: Number(payload.strategy_id),
      monthly_investment: Number(payload.monthly_investment),
    };
    if (payload.initial_capital != null) body.initial_capital = Number(payload.initial_capital);
    if (payload.start_calendar_id != null) body.start_calendar_id = Number(payload.start_calendar_id);
    if (payload.end_calendar_id != null) body.end_calendar_id = Number(payload.end_calendar_id);
    if (payload.rebalance_threshold != null) body.rebalance_threshold = Number(payload.rebalance_threshold);

    const url = `${API_BASE_URL}/api/simulations`;
    const res = await fetch(url, {
      method: 'POST',
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify(body),
    });

    const textBody = await res.text().catch(() => '');
    if (!res.ok) {
      let message = textBody;
      if (textBody) {
        try {
          const parsed = JSON.parse(textBody);
          message = parsed?.message ?? parsed?.detail ?? textBody;
        } catch {}
      }
      const errMsg = `[API ERROR] runSimulation: ${res.status} - ${message}`;
      console.error(errMsg);
      console.log(errMsg);
      throw new HTTPError(message || 'Failed to start simulation', res.status, textBody);
    }

    if (!textBody) {
      return { status: res.status === 202 ? 'accepted' : 'ok' };
    }

    let parsed: SimulationRunResponse | null = null;
    try {
      parsed = JSON.parse(textBody) as SimulationRunResponse;
    } catch (error) {
      throw new HTTPError('Invalid simulation response JSON', res.status, textBody);
    }

    if (!parsed.status) {
      parsed.status = res.status === 202 ? 'accepted' : 'ok';
    }

    return parsed;
  }

  /** Fetch aggregate simulation results for one or more portfolios */
  async getPortfolioResults(options: {
    portfolioIds: number[];
    startCalendarId?: number;
    endCalendarId?: number;
    useCache?: boolean;
  }): Promise<SimulationAggregateSeries[]> {
    if (!options || !Array.isArray(options.portfolioIds)) {
      throw new Error('getPortfolioResults: portfolioIds is required');
    }

    const uniqueIds = Array.from(
      new Set(
        options.portfolioIds
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    );
    if (uniqueIds.length === 0) {
      throw new Error('getPortfolioResults: no valid portfolioId provided');
    }

    const normalizedStart = options.startCalendarId != null ? Number(options.startCalendarId) : undefined;
    if (normalizedStart != null && !Number.isFinite(normalizedStart)) {
      throw new Error('getPortfolioResults: startCalendarId is invalid');
    }
    const normalizedEnd = options.endCalendarId != null ? Number(options.endCalendarId) : undefined;
    if (normalizedEnd != null && !Number.isFinite(normalizedEnd)) {
      throw new Error('getPortfolioResults: endCalendarId is invalid');
    }

    const profile = await this.getCurrentUserProfile();
    const userId = Number(profile.user_id);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new Error('getPortfolioResults: user_id unavailable');
    }

    const sortedIds = uniqueIds.slice().sort((a, b) => a - b);
    const cacheKeyParts = [
      'portfolio_results',
      userId,
      sortedIds.join('_'),
      normalizedStart != null ? normalizedStart : 'any',
      normalizedEnd != null ? normalizedEnd : 'any',
    ];
    const cacheKey = cacheKeyParts.join('_');
    const useCache = options.useCache ?? true;
    if (useCache) {
      const cached = await this.getCache<SimulationAggregateSeries[]>(cacheKey, 30 * 60 * 1000);
      if (cached) return cached;
    }

    const url = new URL('/api/simulations/aggregate-results', API_BASE_URL);
    url.searchParams.append('user_id', String(userId));
    sortedIds.forEach((pid) => url.searchParams.append('portfolio_id', String(pid)));
    if (normalizedStart != null) url.searchParams.append('start_calendar_id', String(normalizedStart));
    if (normalizedEnd != null) url.searchParams.append('end_calendar_id', String(normalizedEnd));

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.withAuth({ Accept: 'application/json', 'Content-Type': 'application/json' }),
    });

    const textBody = await res.text().catch(() => '');
    if (!res.ok) {
      let message = textBody;
      if (textBody) {
        try {
          const parsed = JSON.parse(textBody);
          message = parsed?.message ?? parsed?.detail ?? textBody;
        } catch {
          // ignore JSON parse errors
        }
      }
      if (res.status === 400) {
        throw new HTTPError(message || 'Parametri non validi per i risultati aggregati', res.status, textBody);
      }
      if (res.status === 404) {
        throw new HTTPError(message || 'Utente non trovato', res.status, textBody);
      }
      throw new HTTPError(message || 'Failed to fetch simulation aggregate results', res.status, textBody);
    }

    let parsed: SimulationAggregateResultsResponse | null = null;
    try {
      parsed = textBody ? (JSON.parse(textBody) as SimulationAggregateResultsResponse) : { items: [] };
    } catch {
      throw new HTTPError('Invalid simulation aggregate response JSON', res.status, textBody);
    }

    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const toNumberOrNull = (value: any): number | null => {
      if (value == null) return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const results: SimulationAggregateSeries[] = items
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const portfolioId = Number((item as any).portfolio_id);
        if (!Number.isFinite(portfolioId)) return null;
        const strategyRaw = (item as any).strategy_id;
        const strategyCandidate = strategyRaw != null ? Number(strategyRaw) : null;
        const strategyId = strategyCandidate != null && Number.isFinite(strategyCandidate) ? strategyCandidate : null;
        const pointItems = Array.isArray((item as any).points) ? (item as any).points : [];
        const points = pointItems
          .map((rawPoint: any): SimulationAggregatePoint | null => {
            if (!rawPoint || typeof rawPoint !== 'object') return null;
            const calendarId = Number(rawPoint.calendar_id);
            if (!Number.isFinite(calendarId)) return null;
            const totalValue = toNumberOrNull(rawPoint.total_value_in_dollars);
            if (totalValue == null) return null;
            return {
              calendar_id: calendarId,
              total_value_in_dollars: totalValue,
              invested_value: toNumberOrNull(rawPoint.invested_value),
              gain: toNumberOrNull(rawPoint.gain),
            };
          })
          .filter(
            (point: SimulationAggregatePoint | null): point is SimulationAggregatePoint => point != null
          );

        return {
          portfolio_id: portfolioId,
          strategy_id: strategyId,
          points,
        } as SimulationAggregateSeries;
      })
      .filter((item): item is SimulationAggregateSeries => item != null);

    if (useCache) {
      await this.setCache(cacheKey, results);
    }

    return results;
  }

  async getPortfolios(user_id: number, useCache: boolean = true): Promise<PortfolioSummary[]> {
    if (!Number.isFinite(user_id)) {
      throw new Error('getPortfolios: user_id richiesto');
    }
    const cacheKey = `portfolios_user_${user_id}`;
    if (useCache) {
      const cached = await this.getCache<PortfolioSummary[]>(cacheKey, 60 * 60 * 1000); // 1h
      if (cached) return cached;
    }

    const url = new URL('/api/portfolios', API_BASE_URL);
    url.searchParams.append('user_id', String(user_id));
    const res = await fetch(url.toString(), {
      headers: await this.withAuth({ Accept: 'application/json' }),
    });
    if (!res.ok) {
      const txt = await res.text();
      const errMsg = `[API ERROR] getPortfolios: ${res.status} - ${txt}`;
      console.error(errMsg);
      console.log(errMsg);
      throw new Error(`Failed to fetch portfolios (${res.status}): ${txt}`);
    }
    const raw = (await res.json().catch(() => null)) as PortfolioSummaryResponse | null;
    if (!raw || !Array.isArray(raw.items)) {
      throw new Error('Invalid portfolios response format');
    }
    const items: PortfolioSummary[] = raw.items
      .map((item) => {
        const portfolio_id = Number(item.portfolio_id);
        const uid = Number(item.user_id);
        const name = typeof item.name === 'string' ? item.name : '';
        if (!Number.isFinite(portfolio_id) || !Number.isFinite(uid) || !name) return null;
        return {
          portfolio_id,
          user_id: uid,
          name,
          description: item.description != null ? String(item.description) : null,
          created_at: typeof item.created_at === 'string' ? item.created_at : '',
          last_modified: typeof item.last_modified === 'string' ? item.last_modified : null,
        } as PortfolioSummary;
      })
      .filter((p): p is PortfolioSummary => p != null);

    await this.setCache(cacheKey, items);
    return items;
  }

  async getSimulationStrategies(useCache: boolean = true): Promise<SimulationStrategy[]> {
    const cacheKey = 'simulation_strategies_all';
    if (useCache) {
      const cached = await this.getCache<SimulationStrategy[]>(cacheKey, 6 * 60 * 60 * 1000);
      if (cached) return cached;
    }

    const url = new URL('/api/simulations/strategies', API_BASE_URL);
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.withAuth({ Accept: 'application/json' }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new HTTPError(`Failed to fetch simulation strategies (${res.status})`, res.status, txt);
    }

    const body: SimulationStrategyResponse | null = await res.json().catch(() => null);
    if (!body || !Array.isArray(body.items)) {
      throw new Error('Invalid simulation strategies response format');
    }

    const items: SimulationStrategy[] = body.items
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const strategy_id = Number((item as any).strategy_id);
        if (!Number.isFinite(strategy_id)) return null;
        const strategy_name = String((item as any).strategy_name ?? '').trim();
        if (!strategy_name) return null;
        const strategy_description =
          (item as any).strategy_description != null ? String((item as any).strategy_description) : null;
        return {
          strategy_id,
          strategy_name,
          strategy_description,
        } as SimulationStrategy;
      })
      .filter((item): item is SimulationStrategy => item != null);

    await this.setCache(cacheKey, items);
    return items;
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
  async savePortfolioWithComposition(payload: {
    name: string;
    user_id: number;
    description?: string;
    compositions: Array<{ ticker_id: number; weight: number }>;
  }): Promise<any> {
    if (!payload.name || !payload.user_id) {
      throw new Error('savePortfolioWithComposition: name e user_id sono obbligatori');
    }

    // 1. Crea il portafoglio
    const urlPortfolio = `${API_BASE_URL}/api/portfolios`;
    const portfolioBody: Record<string, any> = {
      name: payload.name,
      user_id: payload.user_id,
    };
    if (payload.description) portfolioBody.description = payload.description;
    const resPortfolio = await fetch(urlPortfolio, {
      method: 'POST',
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify(portfolioBody),
    });
    if (!resPortfolio.ok) {
      const txt = await resPortfolio.text();
      const errMsg = `[API ERROR] savePortfolioWithComposition (portfolio): ${resPortfolio.status} - ${txt}`;
      console.error(errMsg);
      console.log(errMsg);
      throw new Error(`Failed to create portfolio ${urlPortfolio} (${resPortfolio.status}): ${txt}`);
    }
    const portfolio = await resPortfolio.json();
    const rawId = portfolio.portfolio_id ?? portfolio.id;
    const portfolio_id = Number(rawId);
    if (!Number.isFinite(portfolio_id)) {
      throw new Error('Portfolio creation did not return an id');
    }

    // 2. Crea la composizione con il bulk endpoint
    const urlComp = new URL(`${API_BASE_URL}/api/portfolios/composition/bulk`);
    urlComp.searchParams.append('user_id', String(payload.user_id));
    const compositions = payload.compositions.map((c) => ({
      portfolio_id,
      ticker_id: Number(c.ticker_id),
      weight: Number(c.weight),
    }));
    const resComp = await fetch(urlComp.toString(), {
      method: 'POST',
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ compositions }),
    });
    if (!resComp.ok) {
      const txt = await resComp.text();
      const errMsg = `[API ERROR] savePortfolioWithComposition (composition): ${resComp.status} - ${txt}`;
      console.error(errMsg);
      console.log(errMsg);
      throw new Error(`Failed to set composition (bulk) ${urlComp} (${resComp.status}): ${txt}`);
    }
    const compData = await resComp.json();
    await this.invalidatePortfolioCachesForUser(payload.user_id);
    return { portfolio, composition: compData };
  }

  /**
   * Crea un nuovo portafoglio usando il nuovo endpoint.
   */
  /**
   * Crea un nuovo portafoglio usando il nuovo endpoint.
   * @param name Nome del portafoglio (obbligatorio)
   * @param user_id ID utente (obbligatorio)
   * @param description Descrizione opzionale
   */
  async createPortfolio(name: string, user_id: number, description?: string): Promise<any> {
    if (!name || !user_id) {
      throw new Error('createPortfolio: name e user_id sono obbligatori');
    }
    const url = `${API_BASE_URL}/api/portfolios`;
    const body: any = { name, user_id };
    if (description) body.description = description;
    const res = await fetch(url, {
      method: 'POST',
      headers: await this.withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      const errMsg = `[API ERROR] createPortfolio: ${res.status} - ${txt}`;
      console.error(errMsg);
      console.log(errMsg);
      throw new Error(`Failed to create portfolio ${url} (${res.status}): ${txt}`);
    }
    const data = await res.json();
    // invalidate cache of portfolios
    await this.invalidatePortfolioCachesForUser(user_id);
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
      const errMsg = `[API ERROR] setPortfolioComposition: ${res.status} - ${txt}`;
      console.error(errMsg);
      console.log(errMsg);
      throw new Error(`Failed to set composition (bulk) ${url} (${res.status}): ${txt}`);
    }
    const data = await res.json().catch(() => ({ ok: true }));
    await this.invalidatePortfolioCachesForUser(user_id);
    return data;
  }

  /** Delete a portfolio and its composition */
  async deletePortfolio(portfolio_id: number, user_id: number): Promise<PortfolioDeleteResponse> {
    if (!Number.isFinite(portfolio_id)) {
      throw new Error('deletePortfolio: portfolio_id richiesto');
    }
    if (!Number.isFinite(user_id)) {
      throw new Error('deletePortfolio: user_id richiesto');
    }

    const url = new URL(`${API_BASE_URL}/api/portfolios/${portfolio_id}`);
    url.searchParams.append('user_id', String(user_id));

    const res = await fetch(url.toString(), {
      method: 'DELETE',
      headers: await this.withAuth({ Accept: 'application/json', 'Content-Type': 'application/json' }),
    });

    const textBody = await res.text().catch(() => '');
    if (!res.ok) {
      const message = textBody || res.statusText || 'Failed to delete portfolio';
      const errMsg = `[API ERROR] deletePortfolio: ${res.status} - ${message}`;
      console.error(errMsg);
      console.log(errMsg);
      throw new HTTPError(message, res.status, textBody);
    }

    let parsed: any = null;
    if (textBody) {
      try {
        parsed = JSON.parse(textBody);
      } catch {
        parsed = null;
      }
    }

    const payload: PortfolioDeleteResponse = {
      portfolio_id,
      deleted: true,
      removed_compositions: null,
    };

    if (parsed && typeof parsed === 'object') {
      const pid = Number(parsed.portfolio_id ?? parsed.id ?? portfolio_id);
      payload.portfolio_id = Number.isFinite(pid) ? pid : portfolio_id;
      if (typeof parsed.deleted === 'boolean') payload.deleted = parsed.deleted;
      const removed = parsed.removed_compositions ?? parsed.removedComposition ?? parsed.removed;
      if (removed != null && Number.isFinite(Number(removed))) {
        payload.removed_compositions = Number(removed);
      }
    }

    await this.invalidatePortfolioCachesForUser(user_id);
    return payload;
  }
}

export const apiService = new APIService();
export type { GeographyGroup, TickerSummary, SimulationAggregateSeries, SimulationAggregatePoint, CreatePortfolioResponse, ChatCompletionMessage };