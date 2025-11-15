import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
  Animated,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/clerk-expo';
import { ChevronDown, ChevronRight, Sparkles, Layers3, FolderPlus, PlayCircle, BarChart3 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { apiService } from '@/services/api';
import ETFLineChart from '@/components/Chart/LineChart';
import { useTheme } from '@/components/common/ThemeProvider';
import Toast, { ToastType } from '@/components/common/Toast';
import HelpTooltip from '@/components/common/HelpTooltip';
import { TOOLTIP_COPY } from '@/constants/tooltips';
import {
  ChartDataPoint,
  GeographyGroup,
  PortfolioCompositionEntry,
  PortfolioSummary,
  SimulationStrategy,
  SimulationRunPayload,
  SimulationRunResponse,
  TickerSummary,
} from '@/types';

// Section open state persistence
type OpenSections = { composition: boolean; create: boolean; run: boolean; chart: boolean };
const OPEN_SECTIONS_KEY = 'pipeline_open_sections_v1';
const defaultOpen: OpenSections = { composition: false, create: false, run: false, chart: false };

const friendlyAccent = (hex: string, alpha = 0.18) => {
  if (!hex || hex[0] !== '#' || (hex.length !== 7 && hex.length !== 4)) {
    return `rgba(37, 99, 235, ${alpha})`;
  }
  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type CompositionDraft = {
  key: string;
  areaId?: number;
  ticker_id?: number;
  percentuale?: number;
  symbol?: string;
  name?: string;
  asset_class?: string;
};

type SelectModalState = {
  rowKey: string;
  type: 'area' | 'ticker';
};

type ModalOption = {
  value: number;
  label: string;
  subtitle?: string;
};

export default function PipelineScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const pipelineTooltips = TOOLTIP_COPY.pipeline;
  const [idPortafoglio, setIdPortafoglio] = useState('1');
  const [ammontare, setAmmontare] = useState('10000');
  const [capitaleIniziale, setCapitaleIniziale] = useState('0');
  const [rebalanceThreshold, setRebalanceThreshold] = useState('0.05');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const defaultEnd = `${yyyy}${mm}${dd}`;
  const defaultStart = `${yyyy}0101`;
  const [dataInizio, setDataInizio] = useState(defaultStart);
  const [dataFine, setDataFine] = useState(defaultEnd);
  const [starting, setStarting] = useState(false);
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [portfolioCompositions, setPortfolioCompositions] = useState<Record<number, PortfolioCompositionEntry[]>>({});
  const [portfoliosLoading, setPortfoliosLoading] = useState(false);
  const [selectedPortfolios, setSelectedPortfolios] = useState<Record<number, boolean>>({});
  const [portfolioResults, setPortfolioResults] = useState<
    Record<
      number,
      { calendar_id: number; valore_totale: number; invested_value: number | null; gain: number | null }[]
    >
  >({});
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [chartStartDate, setChartStartDate] = useState('');
  const [chartEndDate, setChartEndDate] = useState('');
  const [tableError, setTableError] = useState<string | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationRunResponse | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userProfileError, setUserProfileError] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<SimulationStrategy[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<number | null>(null);
  const [strategiesLoading, setStrategiesLoading] = useState(false);
  const [strategiesError, setStrategiesError] = useState<string | null>(null);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDescription, setNewPortfolioDescription] = useState('');
  const uidRef = useRef(1);
  const genKey = useCallback(() => `row-${uidRef.current++}`, []);
  const [compItems, setCompItems] = useState<CompositionDraft[]>([{ key: genKey() }]);
  const [geographies, setGeographies] = useState<GeographyGroup[]>([]);
  const [saving, setSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openSections, setOpenSections] = useState<OpenSections>(defaultOpen);
  const [selectModal, setSelectModal] = useState<SelectModalState | null>(null);
  const sectionOpacity = useRef<Record<keyof OpenSections, Animated.Value>>({
    composition: new Animated.Value(0),
    create: new Animated.Value(0),
    run: new Animated.Value(0),
    chart: new Animated.Value(0),
  });
  const isMountedRef = useRef(true);
  const canManagePortfolios = currentUserId != null && !userProfileError;

  useEffect(() => {
    // Avoid calling the legacy enabling API on New Architecture (Fabric) where it's a no-op and logs a warning.
    // RN exposes `global.nativeFabricUIManager` when the new architecture is active.
    // We only enable the experimental flag for the old architecture on Android where it's still required.
    // This prevents: "setLayoutAnimationEnabledExperimental is currently a no-op in the New Architecture." warning.
    // @ts-ignore
    const isFabric = (global as any).nativeFabricUIManager != null;
    if (!isFabric && Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);
  const animate = (k: keyof OpenSections, open: boolean) => Animated.timing(sectionOpacity.current[k], { toValue: open?1:0, duration:180, useNativeDriver:true }).start();
  useEffect(()=>{(async()=>{try{const raw=await AsyncStorage.getItem(OPEN_SECTIONS_KEY);if(raw){const merged={...defaultOpen,...JSON.parse(raw)};setOpenSections(merged);(Object.keys(merged) as (keyof OpenSections)[]).forEach(k=>animate(k,merged[k]));}}catch{}})();},[]);
  useEffect(()=>{AsyncStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(openSections)).catch(()=>{});},[openSections]);
  const toggleSection = (k: keyof OpenSections)=>{LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);setOpenSections(p=>{const n={...p,[k]:!p[k]};animate(k,!p[k]);return n;});};

  useEffect(() => {
    if (!selectModal) return;
    if (compItems.some((row) => row.key === selectModal.rowKey)) return;
    setSelectModal(null);
  }, [selectModal, compItems]);

  useEffect(() => {
    let mounted = true;
    apiService
      .getGeographies(true)
      .then((items) => {
        if (mounted) setGeographies(items);
      })
      .catch(() => {
        if (mounted) setGeographies([]);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setStrategiesLoading(true);
    apiService
      .getSimulationStrategies(true)
      .then((items) => {
        if (cancelled || !isMountedRef.current) return;
        setStrategies(items);
        setStrategiesError(null);
        setSelectedStrategyId((prev) => {
          if (prev && items.some((s) => s.strategy_id === prev)) {
            return prev;
          }
          return items.length ? items[0].strategy_id : null;
        });
      })
      .catch((err) => {
        if (cancelled || !isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        setStrategiesError(msg);
        setStrategies([]);
        setSelectedStrategyId(null);
      })
      .finally(() => {
        if (cancelled || !isMountedRef.current) return;
        setStrategiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!user) {
      setCurrentUserId(null);
      setUserProfileError('Sign in to manage your portfolios');
      return;
    }

  setCurrentUserId(null);
  setUserProfileError(null);

  let cancelled = false;
    const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? null;
    if (!email) {
      setUserProfileError('User email not available');
      return;
    }
    const usernameCandidate = user.username ?? (email.includes('@') ? email.split('@')[0] : email);

    const resolveProfile = async () => {
      try {
        const profile = await apiService.getCurrentUserProfile();
        if (cancelled || !isMountedRef.current) return;
        const backendId = Number(profile.user_id);
        if (Number.isFinite(backendId) && backendId > 0) {
          setCurrentUserId(backendId);
          setUserProfileError(null);
          return;
        }
  setUserProfileError('Backend profile missing a valid user_id');
      } catch (err: any) {
        if (cancelled || !isMountedRef.current) return;
        const status = typeof err?.status === 'number' ? err.status : undefined;
        if (status === 404) {
          try {
            const ensuredId = await apiService.ensureUserProfile({ email, username: usernameCandidate });
            if (cancelled || !isMountedRef.current) return;
            if (ensuredId && Number.isFinite(Number(ensuredId))) {
              setCurrentUserId(Number(ensuredId));
              setUserProfileError(null);
              return;
            }
            // Retry fetch if sync didn't return an ID
            const profileAfterSync = await apiService.getCurrentUserProfile();
            if (cancelled || !isMountedRef.current) return;
            const backendId = Number(profileAfterSync.user_id);
            if (Number.isFinite(backendId) && backendId > 0) {
              setCurrentUserId(backendId);
              setUserProfileError(null);
              return;
            }
            setUserProfileError('Backend profile unavailable after synchronization');
          } catch (syncErr) {
            if (cancelled || !isMountedRef.current) return;
            const detail = syncErr instanceof Error ? syncErr.message : String(syncErr);
            setUserProfileError(`Profile sync failed: ${detail}`);
          }
          return;
        }
        if (status === 401 || status === 403) {
          setUserProfileError('Session expired, please sign in again.');
          setCurrentUserId(null);
          return;
        }
        setUserProfileError(err instanceof Error ? err.message : String(err));
      }
    };

    resolveProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);
  const tickerOptionsByArea = useMemo(() => {
    const map: Record<number, TickerSummary[]> = {};
    geographies.forEach((group) => {
      map[group.geography_id] = group.tickers ?? [];
    });
    return map;
  }, [geographies]);
  const tickerLookup = useMemo(() => {
    const map: Record<number, TickerSummary> = {};
    geographies.forEach((group) => {
      (group.tickers ?? []).forEach((ticker) => {
        map[ticker.ticker_id] = ticker;
      });
    });
    return map;
  }, [geographies]);
  const selectedStrategy = useMemo(() => {
    if (selectedStrategyId == null) return null;
    return strategies.find((s) => s.strategy_id === selectedStrategyId) ?? null;
  }, [selectedStrategyId, strategies]);
  const pickerSelectedStrategyId = useMemo(() => {
    if (selectedStrategyId != null) return selectedStrategyId;
    return strategies.length ? strategies[0].strategy_id : undefined;
  }, [selectedStrategyId, strategies]);
  const modalRow = useMemo(() => {
    if (!selectModal) return null;
    return compItems.find((row) => row.key === selectModal.rowKey) ?? null;
  }, [selectModal, compItems]);
  const modalOptions = useMemo<ModalOption[]>(() => {
    if (!selectModal || !modalRow) return [];
    if (selectModal.type === 'area') {
      return geographies.map((geo) => ({
        value: geo.geography_id,
        label: geo.geography_name,
        subtitle: geo.country ?? geo.continent ?? undefined,
      }));
    }
    if (!modalRow.areaId) return [];
    const list = tickerOptionsByArea[modalRow.areaId] ?? [];
    return list.map((ticker) => ({
      value: ticker.ticker_id,
      label: ticker.name || ticker.symbol,
      subtitle: [ticker.symbol, ticker.asset_class].filter(Boolean).join(' • ') || undefined,
    }));
  }, [selectModal, modalRow, geographies, tickerOptionsByArea]);
  const modalSelectedValue = useMemo(() => {
    if (!selectModal || !modalRow) return null;
    return selectModal.type === 'area' ? modalRow.areaId ?? null : modalRow.ticker_id ?? null;
  }, [selectModal, modalRow]);
  const selectedPortfolioCount = useMemo(() => Object.values(selectedPortfolios).filter(Boolean).length, [selectedPortfolios]);
  const totalPortfolios = portfolios.length;
  const totalStrategies = strategies.length;
  const heroGradient = isDark
    ? (['#0F172A', '#1F2937', '#111827'] as const)
    : (['#2563EB', '#1D4ED8', '#1E3A8A'] as const);
  const heroStatus = simulationStatus
    || (simulationResult ? 'Simulation ready to explore' : 'No simulation started yet');
  const heroStats = useMemo(
    () => [
      {
        label: 'Selected portfolios',
        value: totalPortfolios ? `${selectedPortfolioCount}/${totalPortfolios}` : '0',
      },
      {
        label: 'Strategies',
        value: totalStrategies ? String(totalStrategies) : '0',
      },
      {
        label: 'Status',
        value: heroStatus,
      },
    ],
    [heroStatus, selectedPortfolioCount, totalPortfolios, totalStrategies],
  );

  const renderSectionCard = (
    key: keyof OpenSections,
    {
      icon: Icon,
      accent,
      title,
      subtitle,
      children,
    }: {
      icon: React.ComponentType<{ size?: number; color?: string }>;
      accent: string;
      title: string;
      subtitle: string;
      children: React.ReactNode;
    }
  ) => {
    const isOpen = openSections[key];
    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Pressable
          style={styles.cardHeader}
          onPress={() => toggleSection(key)}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
        >
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.cardIconWrap, { backgroundColor: friendlyAccent(accent) }]}> 
              <Icon size={20} color={accent} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>{subtitle}</Text>
            </View>
          </View>
          <ChevronDown
            size={18}
            color={colors.secondaryText}
            style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
          />
        </Pressable>
        {isOpen ? (
          <Animated.View style={[styles.cardBody, { opacity: sectionOpacity.current[key] }]}> 
            {children}
          </Animated.View>
        ) : null}
      </View>
    );
  };
  const startPipeline = useCallback(async () => {
    const fail = (message: string) => {
      setSimulationError(message);
      setToast({ type: 'error', message });
    };

    setSimulationError(null);
    setSimulationStatus(null);
    setSimulationResult(null);

    if (!currentUserId) {
      fail('Sign in to start a simulation.');
      return;
    }

    const portfolioId = Number(idPortafoglio);
    if (!Number.isFinite(portfolioId) || portfolioId <= 0) {
      fail('Enter a valid portfolio ID.');
      return;
    }

    if (selectedStrategyId == null) {
      fail('Select a simulation strategy.');
      return;
    }

    const normalizeNumber = (raw: string): number | null => {
      if (!raw?.trim()) return null;
      const parsed = Number(raw.replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : null;
    };

    const monthlyInvestment = normalizeNumber(ammontare);
    if (monthlyInvestment == null || monthlyInvestment <= 0) {
      fail('Monthly investment must be greater than zero.');
      return;
    }

    const initialCapital = normalizeNumber(capitaleIniziale ?? '');
    if (initialCapital != null && initialCapital < 0) {
      fail('Initial capital cannot be negative.');
      return;
    }

    const thresholdValue = normalizeNumber(rebalanceThreshold ?? '') ?? undefined;
    if (thresholdValue != null && (thresholdValue < 0 || thresholdValue > 1)) {
      fail('Rebalance threshold must be between 0 and 1.');
      return;
    }

    const toCalendarId = (value: string): number | undefined => {
      const trimmed = value?.trim();
      if (!trimmed) return undefined;
      if (!/^\d{8}$/.test(trimmed)) {
        fail('Dates must follow the YYYYMMDD format.');
        throw new Error('invalid_calendar_id');
      }
      return Number(trimmed);
    };

    let startCalendarId: number | undefined;
    let endCalendarId: number | undefined;
    try {
      startCalendarId = toCalendarId(dataInizio);
      endCalendarId = toCalendarId(dataFine);
    } catch (err) {
      if ((err as Error)?.message === 'invalid_calendar_id') {
        return;
      }
      throw err;
    }

    const payload = {
      user_id: currentUserId,
      portfolio_id: portfolioId,
      strategy_id: selectedStrategyId,
      monthly_investment: monthlyInvestment,
      initial_capital: initialCapital ?? undefined,
      start_calendar_id: startCalendarId,
      end_calendar_id: endCalendarId,
      rebalance_threshold: thresholdValue,
    } satisfies SimulationRunPayload;

    setStarting(true);
    try {
      const response = await apiService.runSimulation(payload);
      if (!isMountedRef.current) return;
      const statusValue = response.status ?? 'started';
      setSimulationStatus(statusValue);
      setSimulationResult(response);
      if (response.message) {
        setToast({ type: 'success', message: response.message });
      } else {
    setToast({ type: 'success', message: 'Simulation started.' });
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      const message = error instanceof Error ? error.message : String(error);
      fail(message);
    } finally {
      if (isMountedRef.current) setStarting(false);
    }
  }, [ammontare, capitaleIniziale, currentUserId, dataFine, dataInizio, rebalanceThreshold, selectedStrategyId, idPortafoglio]);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  useEffect(()=>{if(!toast) return;const t=setTimeout(()=>setToast(null),4000);return()=>clearTimeout(t);},[toast]);
  const loadPortfolios = useCallback(async (options?: { bypassCache?: boolean }) => {
    if (!currentUserId) return;
    const useCache = options?.bypassCache ? false : true;
    setPortfoliosLoading(true);
    if (!options?.bypassCache) setTableError(null);
    try {
      const summaries = await apiService.getPortfolios(currentUserId, useCache);
      if (!isMountedRef.current) return;
      setPortfolios(summaries);
      setTableError(null);

      const compResults = await Promise.all(
        summaries.map(async (summary) => {
          try {
            const response = await apiService.getPortfolioComposition(summary.portfolio_id, currentUserId, useCache);
            return [summary.portfolio_id, response.items] as [number, PortfolioCompositionEntry[]];
          } catch (error) {
            console.error('[pipeline] composition fetch error', error);
            return [summary.portfolio_id, []] as [number, PortfolioCompositionEntry[]];
          }
        })
      );
      if (!isMountedRef.current) return;
      const mapped: Record<number, PortfolioCompositionEntry[]> = Object.fromEntries(compResults);
      setPortfolioCompositions(mapped);
    } catch (err) {
      if (!isMountedRef.current) return;
      setTableError(err instanceof Error ? err.message : String(err));
    } finally {
      if (isMountedRef.current) setPortfoliosLoading(false);
    }
  }, [currentUserId]);
  useEffect(() => {
    if (!currentUserId) return;
    loadPortfolios({ bypassCache: false });
  }, [currentUserId, loadPortfolios]);
  
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadPortfolios({ bypassCache: true });
      setToast({ type: 'success', message: 'Portfolio composition updated.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh';
      setToast({ type: 'error', message });
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!portfolios.length) {
      setSelectedPortfolios({});
      setPortfolioResults({});
      return;
    }
    const validIds = new Set(portfolios.map((p) => p.portfolio_id));
    setSelectedPortfolios((prev) => {
      let changed = false;
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const id = Number(key);
        if (validIds.has(id)) {
          next[id] = value;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    setPortfolioResults((prev) => {
      let changed = false;
  const next: Record<number, { calendar_id: number; valore_totale: number; invested_value: number | null; gain: number | null }[]> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const id = Number(key);
        if (validIds.has(id)) {
          next[id] = value;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [portfolios]);
  const togglePortfolio=(id:number)=>setSelectedPortfolios(p=>({...p,[id]:!p[id]}));
  useEffect(() => {
    const ids = Object.keys(selectedPortfolios)
      .filter((key) => selectedPortfolios[Number(key)])
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value));
    if (!ids.length) return;

    const uniqueIds = Array.from(new Set(ids));
    let cancelled = false;
    setResultsLoading(true);
    setResultsError(null);

    (async () => {
      try {
        const series = await apiService.getPortfolioResults({
          portfolioIds: uniqueIds,
          useCache: true,
        });
        if (cancelled) return;

        const mapped: Record<number, { calendar_id: number; valore_totale: number; invested_value: number | null; gain: number | null }[]> = {};
        uniqueIds.forEach((pid) => {
          mapped[pid] = [];
        });
        series.forEach((item) => {
          mapped[item.portfolio_id] = (item.points ?? []).map((point) => ({
            calendar_id: point.calendar_id,
            valore_totale: point.total_value_in_dollars,
            invested_value: point.invested_value ?? null,
            gain: point.gain ?? null,
          }));
        });

        setPortfolioResults((prev) => {
          const next = { ...prev };
          uniqueIds.forEach((pid) => {
            next[pid] = mapped[pid] ?? [];
          });
          return next;
        });
      } catch (e) {
        if (!cancelled) setResultsError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setResultsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPortfolios]);
  const addCompRow = () => setCompItems((p) => [...p, { key: genKey() }]);
  const removeCompRow = (key: string) => setCompItems((p) => p.filter((r) => r.key !== key));
  const updateCompRow = (key: string, patch: Partial<CompositionDraft>) =>
    setCompItems((p) => p.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const totalPercent=useMemo(()=>compItems.reduce((s,r)=>s+(Number(r.percentuale)||0),0),[compItems]);
  const openSelectModal = useCallback((state: SelectModalState) => {
    if (Platform.OS !== 'ios') return;
    setSelectModal(state);
  }, []);
  const handleSelectOption = useCallback((value: number) => {
    if (!selectModal) return;
    if (selectModal.type === 'area') {
      updateCompRow(selectModal.rowKey, {
        areaId: value,
        ticker_id: undefined,
        symbol: undefined,
        name: undefined,
        asset_class: undefined,
      });
      setSelectModal(null);
      return;
    }
    if (!modalRow?.areaId) {
      setSelectModal(null);
      return;
    }
    const list = tickerOptionsByArea[modalRow.areaId] ?? [];
    const found = list.find((ticker) => ticker.ticker_id === value);
    updateCompRow(selectModal.rowKey, {
      ticker_id: value,
      symbol: found?.symbol,
      name: found?.name,
      asset_class: found?.asset_class,
    });
    setSelectModal(null);
  }, [selectModal, modalRow, tickerOptionsByArea, updateCompRow]);
  const handleClearSelection = useCallback(() => {
    if (!selectModal) return;
    if (selectModal.type === 'area') {
      updateCompRow(selectModal.rowKey, {
        areaId: undefined,
        ticker_id: undefined,
        symbol: undefined,
        name: undefined,
        asset_class: undefined,
      });
    } else {
      updateCompRow(selectModal.rowKey, {
        ticker_id: undefined,
        symbol: undefined,
        name: undefined,
        asset_class: undefined,
      });
    }
    setSelectModal(null);
  }, [selectModal, updateCompRow]);
  const createPortfolioAndSave = useCallback(async () => {
    setTableError(null);
    if (!currentUserId) {
  setTableError('User profile not available');
      return;
    }
    const trimmedName = newPortfolioName.trim();
    if (!trimmedName) {
      setTableError('Enter a portfolio name');
      return;
    }
    if (!compItems.length) {
      setTableError('Add at least one composition row');
      return;
    }
    if (Math.abs(totalPercent - 100) > 0.01) {
      setTableError('Percentages must sum to 100');
      return;
    }

    const compositions = compItems
      .map((row) => ({
        ticker_id: row.ticker_id,
        percent: Number(row.percentuale),
      }))
      .filter((row) => Number.isFinite(row.ticker_id) && Number.isFinite(row.percent) && row.percent != null)
      .map((row) => ({
        ticker_id: row.ticker_id as number,
        weight: Number(((row.percent as number) / 100).toFixed(6)),
      }))
      .filter((row) => Number.isFinite(row.weight) && row.weight >= 0);

    if (!compositions.length) {
      setTableError('Select valid tickers and percentages');
      return;
    }

    setSaving(true);
    try {
      await apiService.savePortfolioWithComposition({
        name: trimmedName,
        user_id: currentUserId,
        description: newPortfolioDescription.trim() || undefined,
        compositions,
      });
      if (!isMountedRef.current) return;
      setNewPortfolioName('');
      setNewPortfolioDescription('');
      setCompItems([{ key: genKey() }]);
      await loadPortfolios({ bypassCache: true });
      if (!isMountedRef.current) return;
      setToast({ type: 'success', message: 'Portfolio created and composition saved.' });
    } catch (e) {
      if (!isMountedRef.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      setTableError(msg);
      setToast({ type: 'error', message: `Save error: ${msg}` });
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  }, [compItems, currentUserId, genKey, loadPortfolios, newPortfolioDescription, newPortfolioName, totalPercent]);
  const portfolioDatasets=useMemo(()=>{const ids=Object.keys(selectedPortfolios).filter(k=>selectedPortfolios[Number(k)]).map(Number);if(!ids.length)return null;const startInt=chartStartDate.length===8?parseInt(chartStartDate,10):null;const endInt=chartEndDate.length===8?parseInt(chartEndDate,10):null;const datasets=ids.map(pid=>{const rows=(portfolioResults[pid]||[]).slice().sort((a,b)=>a.calendar_id-b.calendar_id);const filtered=rows.filter(r=>{if(startInt&&r.calendar_id<startInt)return false; if(endInt&&r.calendar_id>endInt)return false; return true;});const data=filtered.map(r=>r.valore_totale);const labels=filtered.map(r=>{const s=String(r.calendar_id);return s.length===8?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:s;});return {label:`P${pid}`,data,labels,colorHint:data.length&&data[data.length-1]>=data[0]?'up':'down' as const};}).filter(ds=>ds.data.length>0);return datasets.length?datasets:null;},[portfolioResults,selectedPortfolios,chartStartDate,chartEndDate]);
  const renderPortfolioTable = (items: PortfolioSummary[]) => {
    if (!items || !items.length) return <></>;
    let maxPositions = 0;
    const rows = items.map((summary) => {
      const composition = portfolioCompositions[summary.portfolio_id] ?? [];
      if (composition.length > maxPositions) maxPositions = composition.length;
      return { summary, composition };
    });

    const headers = ['Sel', 'Portfolio_ID', 'Name', 'Description'];
    for (let i = 1; i <= maxPositions; i++) {
      headers.push(`Ticker ${i}`);
      headers.push(`Weight ${i}`);
    }

    return (
      <View style={[styles.tableContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.tableHeaderRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {headers.map((h, idx) => (
            <View key={h + idx} style={[styles.headerCell, { borderColor: colors.border }, idx === headers.length - 1 && styles.lastCell]}>
              <Text style={[styles.headerText, { color: colors.text }]}>{h}</Text>
            </View>
          ))}
        </View>
        {rows.map(({ summary, composition }) => (
          <Swipeable
            key={summary.portfolio_id}
            renderLeftActions={() => (
              <Pressable
                onPress={async () => {
                  if (!currentUserId) {
                    setToast({ type: 'error', message: 'Sign in to delete a portfolio.' });
                    return;
                  }
                  try {
                    const result = await apiService.deletePortfolio(summary.portfolio_id, currentUserId);
                    await loadPortfolios({ bypassCache: true });
                    setSelectedPortfolios((prev) => {
                      if (!(summary.portfolio_id in prev)) return prev;
                      const next = { ...prev };
                      delete next[summary.portfolio_id];
                      return next;
                    });
                    setPortfolioResults((prev) => {
                      if (!(summary.portfolio_id in prev)) return prev;
                      const next = { ...prev };
                      delete next[summary.portfolio_id];
                      return next;
                    });
                    const removedMsg = result?.removed_compositions != null
                      ? ` (${result.removed_compositions} items removed)`
                      : '';
                    setToast({ type: 'success', message: `Portfolio ${summary.portfolio_id} deleted${removedMsg}.` });
                  } catch (e) {
                    console.error('[pipeline] deletePortfolio failed', e);
                    const status = typeof (e as any)?.status === 'number' ? (e as any).status : undefined;
                    let msg = e instanceof Error ? e.message : String(e);
                    if (status === 403) {
                      msg = "You cannot delete another user's portfolio.";
                    } else if (status === 404) {
                      msg = 'Portfolio not found or already deleted.';
                    }
                    setToast({ type: 'error', message: `Delete error: ${msg}` });
                  }
                }}
                style={[styles.deleteAction, styles.deleteActionLeft]}
              >
                <Text style={styles.deleteActionText}>Delete</Text>
              </Pressable>
            )}
          >
            <View style={[styles.tableRow, { borderColor: colors.border }]}>
              <View style={[styles.cell, styles.firstCell, { alignItems: 'center', borderColor: colors.border }]}>
                <Pressable
                  onPress={() => togglePortfolio(summary.portfolio_id)}
                  style={[
                    styles.checkbox,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    selectedPortfolios[summary.portfolio_id] && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                >
                  <Text style={styles.checkboxMark}>{selectedPortfolios[summary.portfolio_id] ? '✓' : ''}</Text>
                </Pressable>
              </View>
              <View style={[styles.cell, styles.firstCell, { borderColor: colors.border }]}>
                <Text style={[styles.cellText, { color: colors.text }]}>{summary.portfolio_id}</Text>
              </View>
              <View style={[styles.cell, { minWidth: 180, borderColor: colors.border }]}>
                <Text style={[styles.cellText, { color: colors.text }]}>{summary.name}</Text>
              </View>
              <View style={[styles.cell, { minWidth: 220, borderColor: colors.border }]}>
                <Text style={[styles.cellText, { color: colors.secondaryText }]}>{summary.description ?? '—'}</Text>
              </View>
              {Array.from({ length: maxPositions }).map((_, idx) => {
                const entry = composition[idx];
                const tickerInfo = entry ? tickerLookup[entry.ticker_id] : undefined;
                const tickerLabel = entry ? tickerInfo?.symbol ?? tickerInfo?.name ?? `#${entry.ticker_id}` : '';
                const weightValue = entry?.weight ?? null;
                const weightPercent = weightValue != null
                  ? (weightValue <= 1 ? weightValue * 100 : weightValue)
                  : null;
                const isLast = idx === maxPositions - 1;
                return (
                  <React.Fragment key={`${summary.portfolio_id}-${idx}`}>
                    <View style={[styles.cell, { borderColor: colors.border }, isLast && styles.lastCell]}>
                      <Text style={[styles.cellText, { color: colors.secondaryText }]}>{tickerLabel}</Text>
                    </View>
                    <View style={[styles.cell, { borderColor: colors.border }, isLast && styles.lastCell]}>
                      <Text style={[styles.cellText, { color: colors.secondaryText }]}>
                        {weightPercent != null ? `${weightPercent.toFixed(2)}%` : ''}
                      </Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </Swipeable>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, zIndex: 20 }}>
          {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
        </View>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: Math.max(28, insets.bottom + 16),
            paddingTop: Math.max(24, insets.top + 12),
            rowGap: 20,
          }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          <LinearGradient
            colors={heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { shadowColor: isDark ? '#1E3A8A' : '#0F172A' }]}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}> 
                <Sparkles size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Pipeline workspace</Text>
                <Text style={styles.heroSubtitle}>{heroStatus}</Text>
              </View>
              <Pressable
                onPress={() => {
                  if (!openSections.run) {
                    toggleSection('run');
                  }
                }}
                style={styles.heroCta}
              >
                <Text style={styles.heroCtaText}>Run</Text>
                <ChevronRight size={16} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={styles.heroStatsRow}>
              {heroStats.map((stat) => (
                <View
                  key={stat.label}
                  style={[
                    styles.heroStatCard,
                    {
                      backgroundColor: 'rgba(255,255,255,0.16)',
                      borderColor: 'rgba(255,255,255,0.35)',
                    },
                  ]}
                >
                  <Text style={styles.heroStatLabel}>{stat.label}</Text>
                  <Text style={styles.heroStatValue} numberOfLines={1}>
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {renderSectionCard('composition', {
            icon: Layers3,
            accent: '#6366F1',
            title: 'Portfolio library',
            subtitle: 'Review saved mixes and select which ones to chart.',
            children: (
              <View style={styles.cardContentGap}>
                <View style={styles.inlineHelpRow}>
                  <HelpTooltip
                    title={pipelineTooltips.compositionSection.title}
                    description={pipelineTooltips.compositionSection.description}
                  />
                  <HelpTooltip
                    title={pipelineTooltips.deletePortfolio.title}
                    description={pipelineTooltips.deletePortfolio.description}
                  />
                </View>
                {userProfileError && <Text style={styles.error}>{userProfileError}</Text>}
                {!userProfileError && tableError && <Text style={styles.error}>{tableError}</Text>}
                {portfoliosLoading ? (
                  <Text style={styles.small}>Loading portfolios…</Text>
                ) : !canManagePortfolios ? (
                  <Text style={styles.small}>Sign in to view your portfolios.</Text>
                ) : portfolios.length === 0 ? (
                  <Text style={styles.small}>No portfolios available</Text>
                ) : (
                  <ScrollView
                    horizontal
                    style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
                    contentContainerStyle={{ padding: 8 }}
                    showsHorizontalScrollIndicator={false}
                  >
                    {renderPortfolioTable(portfolios)}
                  </ScrollView>
                )}
              </View>
            ),
          })}

          {renderSectionCard('create', {
            icon: FolderPlus,
            accent: '#2563EB',
            title: 'Create a portfolio',
            subtitle: 'Name it, assign tickers, and save for future runs.',
            children: (
              <View style={styles.cardContentGap}>
                {userProfileError && <Text style={styles.error}>{userProfileError}</Text>}
                {!userProfileError && tableError && <Text style={styles.error}>{tableError}</Text>}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.secondaryText }]}>Portfolio Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    value={newPortfolioName}
                    onChangeText={setNewPortfolioName}
                    placeholder="e.g. Growth 2025"
                    placeholderTextColor={colors.secondaryText}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.secondaryText }]}>Description (optional)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    value={newPortfolioDescription}
                    onChangeText={setNewPortfolioDescription}
                    placeholder="Short description"
                    placeholderTextColor={colors.secondaryText}
                  />
                </View>
                <Text style={[styles.label, { marginTop: 8, color: colors.secondaryText }]}>Composition (must sum to 100)</Text>
                {compItems.map((row) => {
                  const areaInfo = row.areaId != null ? geographies.find((g) => g.geography_id === row.areaId) ?? null : null;
                  const tickerInfo = row.ticker_id != null ? tickerLookup[row.ticker_id] : undefined;
                  const tickerPrimary = tickerInfo?.name || tickerInfo?.symbol || row.name || row.symbol || null;
                  const tickerSecondary = tickerInfo
                    ? [tickerInfo.symbol, tickerInfo.asset_class].filter(Boolean).join(' • ')
                    : row.symbol
                    ? [row.symbol, row.asset_class].filter(Boolean).join(' • ')
                    : null;
                  return (
                    <View key={row.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      {Platform.OS === 'ios' ? (
                        <Pressable
                          onPress={() => openSelectModal({ rowKey: row.key, type: 'area' })}
                          style={[
                            styles.iosSelectBtn,
                            { flex: 0.9, marginRight: 8, backgroundColor: colors.card, borderColor: colors.border },
                          ]}
                        >
                          <View style={styles.iosSelectValue}>
                            <Text
                              style={[
                                styles.iosSelectLabel,
                                { color: areaInfo ? colors.text : colors.secondaryText },
                              ]}
                              numberOfLines={1}
                            >
                              {areaInfo ? areaInfo.geography_name : 'Select area'}
                            </Text>
                            {areaInfo && (areaInfo.country || areaInfo.continent) ? (
                              <Text
                                style={[styles.iosSelectSubtitle, { color: colors.secondaryText }]}
                                numberOfLines={1}
                              >
                                {areaInfo.country || areaInfo.continent}
                              </Text>
                            ) : null}
                          </View>
                          <ChevronDown size={16} color={colors.secondaryText} />
                        </Pressable>
                      ) : (
                        <View
                          style={[
                            styles.pickerWrapper,
                            { flex: 0.9, marginRight: 8, backgroundColor: colors.card, borderColor: colors.border },
                          ]}
                        >
                          <Picker
                            selectedValue={row.areaId ?? null}
                            onValueChange={(v) => {
                              const areaId = typeof v === 'number' ? v : undefined;
                              updateCompRow(row.key, {
                                areaId,
                                ticker_id: undefined,
                                symbol: undefined,
                                name: undefined,
                                asset_class: undefined,
                              });
                            }}
                          >
                            <Picker.Item label="Area" value={null as any} />
                            {geographies.map((g) => (
                              <Picker.Item key={g.geography_id} label={g.geography_name} value={g.geography_id} />
                            ))}
                          </Picker>
                        </View>
                      )}

                      {Platform.OS === 'ios' ? (
                        <Pressable
                          onPress={() => row.areaId && openSelectModal({ rowKey: row.key, type: 'ticker' })}
                          disabled={!row.areaId}
                          style={[
                            styles.iosSelectBtn,
                            {
                              flex: 1.2,
                              marginRight: 8,
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                            !row.areaId && styles.iosSelectBtnDisabled,
                          ]}
                        >
                          <View style={styles.iosSelectValue}>
                            <Text
                              style={[
                                styles.iosSelectLabel,
                                { color: tickerPrimary ? colors.text : colors.secondaryText },
                              ]}
                              numberOfLines={1}
                            >
                              {tickerPrimary || 'Select ETF'}
                            </Text>
                            {tickerSecondary ? (
                              <Text
                                style={[styles.iosSelectSubtitle, { color: colors.secondaryText }]}
                                numberOfLines={1}
                              >
                                {tickerSecondary}
                              </Text>
                            ) : null}
                          </View>
                          <ChevronDown size={16} color={colors.secondaryText} />
                        </Pressable>
                      ) : (
                        <View
                          style={[
                            styles.pickerWrapper,
                            {
                              flex: 1.2,
                              marginRight: 8,
                              opacity: row.areaId ? 1 : 0.6,
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Picker
                            enabled={!!row.areaId}
                            selectedValue={row.ticker_id ?? null}
                            onValueChange={(v) => {
                              const id = typeof v === 'number' ? v : undefined;
                              const list = row.areaId ? tickerOptionsByArea[row.areaId] || [] : [];
                              const found = typeof id === 'number' ? list.find((t) => t.ticker_id === id) : undefined;
                              updateCompRow(row.key, {
                                ticker_id: id,
                                symbol: found?.symbol,
                                name: found?.name,
                                asset_class: found?.asset_class,
                              });
                            }}
                          >
                            <Picker.Item label="Ticker" value={null as any} />
                            {(row.areaId ? tickerOptionsByArea[row.areaId] || [] : []).map((t) => (
                              <Picker.Item
                                key={t.ticker_id}
                                label={`${t.name || t.symbol} (${t.symbol})${t.asset_class ? ` • ${t.asset_class}` : ''}`}
                                value={t.ticker_id}
                              />
                            ))}
                          </Picker>
                        </View>
                      )}
                      <TextInput
                        style={[styles.input, { flex: 0.6, marginRight: 8, backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        value={row.percentuale != null ? String(row.percentuale) : ''}
                        onChangeText={(v) => {
                          if (!v.trim()) {
                            updateCompRow(row.key, { percentuale: undefined });
                            return;
                          }
                          const numeric = Number(v.replace(',', '.'));
                          updateCompRow(row.key, { percentuale: Number.isFinite(numeric) ? numeric : undefined });
                        }}
                        placeholder="%"
                        keyboardType="numeric"
                        placeholderTextColor={colors.secondaryText}
                      />
                      <Pressable onPress={() => removeCompRow(row.key)} style={[styles.checkbox, { width: 28, height: 28 }]}>
                        <Text style={styles.checkboxMark}>-</Text>
                      </Pressable>
                    </View>
                  );
                })}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Pressable onPress={addCompRow} style={[styles.checkbox, { width: 28, height: 28, marginRight: 8 }]}>
                    <Text style={styles.checkboxMark}>+</Text>
                  </Pressable>
                  <Text style={styles.small}>Total: {totalPercent.toFixed(1)}%</Text>
                </View>
                <View style={[styles.inlineHelpRow, { marginTop: 8 }]}>
                  <Pressable
                    style={[styles.btn, { flex: 1, marginTop: 0 }, (saving || !canManagePortfolios) && { opacity: 0.7 }]}
                    onPress={createPortfolioAndSave}
                    disabled={saving || !canManagePortfolios}
                  >
                    <Text style={styles.btnText}>{saving ? 'Saving…' : 'Create & Save Composition'}</Text>
                  </Pressable>
                  <HelpTooltip
                    title={pipelineTooltips.saveComposition.title}
                    description={pipelineTooltips.saveComposition.description}
                  />
                </View>
              </View>
            ),
          })}

          {renderSectionCard('run', {
            icon: PlayCircle,
            accent: '#F97316',
            title: 'Run a simulation',
            subtitle: 'Configure capital, strategy, and dates before launching.',
            children: (
              <View style={styles.cardContentGap}>
                <View style={styles.inlineHelpRow}>
                  <HelpTooltip
                    title={pipelineTooltips.runSection.title}
                    description={pipelineTooltips.runSection.description}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.secondaryText }]}>Portfolio ID</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    value={idPortafoglio}
                    onChangeText={setIdPortafoglio}
                    keyboardType="number-pad"
                    placeholderTextColor={colors.secondaryText}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.secondaryText }]}>Amount</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    value={ammontare}
                    onChangeText={setAmmontare}
                    keyboardType="numeric"
                    placeholderTextColor={colors.secondaryText}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.secondaryText }]}>Initial Capital</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    value={capitaleIniziale}
                    onChangeText={setCapitaleIniziale}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.secondaryText}
                  />
                </View>
                <View style={styles.field}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: colors.secondaryText, marginBottom: 0 }]}>Strategy</Text>
                    <HelpTooltip
                      title={pipelineTooltips.strategyPicker.title}
                      description={pipelineTooltips.strategyPicker.description}
                    />
                  </View>
                  {strategiesLoading ? (
                    <Text style={styles.small}>Loading strategies…</Text>
                  ) : strategies.length ? (
                    <View style={[styles.pickerWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>  
                      <Picker
                        selectedValue={pickerSelectedStrategyId}
                        onValueChange={(value) => {
                          const numeric = typeof value === 'number' ? value : Number(value);
                          setSelectedStrategyId(Number.isFinite(numeric) ? numeric : null);
                        }}
                      >
                        {strategies.map((strategy) => (
                          <Picker.Item
                            key={strategy.strategy_id}
                            label={strategy.strategy_name}
                            value={strategy.strategy_id}
                          />
                        ))}
                      </Picker>
                    </View>
                  ) : (
                    <Text style={styles.small}>No strategies available</Text>
                  )}
                  {strategiesError && <Text style={styles.error}>{strategiesError}</Text>}
                  {selectedStrategy?.strategy_description && (
                    <Text style={[styles.small, { color: colors.secondaryText, marginTop: 4 }]}> 
                      {selectedStrategy.strategy_description}
                    </Text>
                  )}
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.secondaryText }]}>Rebalance Threshold (0-1)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    value={rebalanceThreshold}
                    onChangeText={setRebalanceThreshold}
                    placeholder="0.05"
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.secondaryText}
                  />
                </View>
                <View style={styles.row}>
                  <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: colors.secondaryText }]}>Start Date (YYYYMMDD)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                      value={dataInizio}
                      onChangeText={setDataInizio}
                      keyboardType="number-pad"
                      placeholderTextColor={colors.secondaryText}
                    />
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.secondaryText }]}>End Date (YYYYMMDD)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                      value={dataFine}
                      onChangeText={setDataFine}
                      keyboardType="number-pad"
                      placeholderTextColor={colors.secondaryText}
                    />
                  </View>
                </View>
                {simulationError && <Text style={styles.error}>{simulationError}</Text>}
                <Pressable style={[styles.btn, starting && { opacity: 0.6 }]} onPress={startPipeline} disabled={starting}>
                  <Text style={styles.btnText}>{starting ? 'Starting…' : 'Run Pipeline'}</Text>
                </Pressable>
                <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statusLabel, { color: colors.secondaryText }]}>Simulation Status</Text>
                  <Text style={[styles.statusValue, { color: colors.text }]}> 
                    {simulationStatus ?? 'No simulation started yet'}
                  </Text>
                  {simulationResult?.message && (
                    <Text style={[styles.small, { color: colors.secondaryText }]}>{simulationResult.message}</Text>
                  )}
                  {simulationResult && (
                    <Text style={[styles.small, { color: colors.secondaryText }]}> 
                      {`Asset rows: ${simulationResult.asset_rows?.length ?? 0} • Aggregate rows: ${simulationResult.aggregate_rows?.length ?? 0} • Transactions: ${simulationResult.transaction_rows?.length ?? 0}`}
                    </Text>
                  )}
                </View>
              </View>
            ),
          })}

          {renderSectionCard('chart', {
            icon: BarChart3,
            accent: '#0EA5E9',
            title: 'Results & charts',
            subtitle: 'Filter the timeline and inspect total value curves.',
            children: (
              <View style={styles.cardContentGap}>
                <View style={styles.inlineHelpRow}>
                  <HelpTooltip
                    title={pipelineTooltips.chartSection.title}
                    description={pipelineTooltips.chartSection.description}
                  />
                </View>
                <View style={styles.row}>
                  <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: colors.secondaryText }]}>Start (YYYYMMDD)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                      value={chartStartDate}
                      onChangeText={setChartStartDate}
                      placeholder="e.g. 20240101"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.secondaryText }]}>End (YYYYMMDD)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                      value={chartEndDate}
                      onChangeText={setChartEndDate}
                      placeholder="e.g. 20241231"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                {(chartStartDate || chartEndDate) && (
                  <Text style={styles.small}>
                    Active filter {chartStartDate && `from ${chartStartDate}`} {chartEndDate && `to ${chartEndDate}`}
                  </Text>
                )}
                {resultsError && <Text style={styles.error}>{resultsError}</Text>}
                {resultsLoading && !portfolioDatasets && (
                  <Text style={[styles.small, { color: colors.secondaryText }]}>Loading results…</Text>
                )}
                {!resultsLoading && (!portfolioDatasets || !portfolioDatasets.length) && (
                  <Text style={[styles.small, { color: colors.secondaryText }]}>Select one or more portfolios from the table above.</Text>
                )}
                {portfolioDatasets && portfolioDatasets.length > 0 && (
                  <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <ETFLineChart
                      multi={portfolioDatasets.map((ds) => ({
                        label: ds.label,
                        data: ds.data,
                        labels: ds.labels,
                        colorHint: ds.colorHint as 'up' | 'down',
                      }))}
                      data={[] as unknown as ChartDataPoint[]}
                      ticker="Portfolios"
                      height={220}
                    />
                  </View>
                )}
              </View>
            ),
          })}
        </ScrollView>
  {/* iOS selector modal */}
  {Platform.OS === 'ios' && selectModal && modalRow && (
          <Modal
            transparent
            visible
            animationType="fade"
            onRequestClose={() => setSelectModal(null)}
          >
            <View style={[styles.selectOverlay, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}> 
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectModal(null)} />
              <View style={[styles.selectCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                <View style={[styles.selectHandle, { backgroundColor: colors.border }]} />
                <Text style={[styles.selectTitle, { color: colors.text }]}> 
                  {selectModal.type === 'area' ? 'Select geographic area' : 'Select ETF'}
                </Text>
                {modalSelectedValue != null && (
                  <Pressable
                    style={[styles.clearBtn, { borderColor: colors.border }]}
                    onPress={handleClearSelection}
                  >
                    <Text style={[styles.clearBtnText, { color: colors.secondaryText }]}>Clear selection</Text>
                  </Pressable>
                )}
                <FlatList
                  data={modalOptions}
                  keyExtractor={(item) => String(item.value)}
                  renderItem={({ item }) => {
                    const isActive = modalSelectedValue === item.value;
                    return (
                      <Pressable
                        onPress={() => handleSelectOption(item.value)}
                        style={[
                          styles.selectOption,
                          { borderColor: colors.border, backgroundColor: colors.card },
                          isActive && styles.selectOptionSelected,
                        ]}
                      >
                        <Text style={[styles.selectOptionLabel, { color: colors.text }]} numberOfLines={1}>
                          {item.label}
                        </Text>
                        {item.subtitle ? (
                          <Text style={[styles.selectOptionSubtitle, { color: colors.secondaryText }]} numberOfLines={1}>
                            {item.subtitle}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={
                    <Text style={[styles.emptyModalText, { color: colors.secondaryText }]}>
                      {selectModal.type === 'area'
                        ? 'No areas available'
                        : modalRow?.areaId
                        ? 'No ETFs available for this area'
                        : 'Select an area first'}
                    </Text>
                  }
                  contentContainerStyle={modalOptions.length ? { paddingVertical: 12 } : { paddingVertical: 24 }}
                  style={{ maxHeight: 360 }}
                  keyboardShouldPersistTaps="handled"
                />
                <Pressable
                  style={[styles.modalCloseBtn, { borderColor: colors.border }]}
                  onPress={() => setSelectModal(null)}
                >
                  <Text style={[styles.modalCloseText, { color: colors.secondaryText }]}>Close</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 12 },
  heroCard: {
    borderRadius: 22,
    padding: 22,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 16,
    marginBottom: 18,
  },
  heroBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.88)',
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 12,
  },
  heroStatCard: {
    flex: 1,
    minWidth: 120,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  heroStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.75)',
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
    color: '#FFFFFF',
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    flex: 1,
  },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  cardBody: {
    paddingTop: 16,
  },
  cardContentGap: {
    gap: 14,
  },
  field: { marginBottom: 10 },
  label: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 8,
    marginBottom: 10,
  },
  sectionHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitleText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 0,
  },
  inlineHelpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    flexShrink: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iosSelectBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iosSelectBtnDisabled: { opacity: 0.5 },
  iosSelectValue: { flex: 1, marginRight: 8 },
  iosSelectLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  iosSelectSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  row: { flexDirection: 'row' },
  btn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#FFF', fontWeight: '700' },
  pickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  statusCard: { marginTop: 16, backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  statusLabel: { fontSize: 12, color: '#6B7280' },
  statusValue: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 6 },
  small: { fontSize: 12, color: '#374151', marginTop: 6 },
  error: { color: '#DC2626', marginBottom: 8 },
  // table styles
  tableContainer: { backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#F3F4F6' },
  headerCell: { minWidth: 120, paddingVertical: 8, paddingHorizontal: 10, borderRightWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center' },
  firstCell: { minWidth: 120 },
  cell: { minWidth: 120, paddingVertical: 8, paddingHorizontal: 10, borderRightWidth: 1, borderColor: '#F3F4F6', justifyContent: 'center' },
  lastCell: { borderRightWidth: 0 },
  headerText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  cellText: { fontSize: 13, color: '#374151' },
  // checkbox styles reused from index screen
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  checkboxOn: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  checkboxMark: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  deleteAction: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 1,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  deleteActionLeft: { alignSelf: 'stretch' },
  deleteActionText: { color: '#FFF', fontWeight: '700' },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  selectOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    paddingHorizontal: 16,
  },
  selectCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  selectHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  selectTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  clearBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  clearBtnText: { fontSize: 13, fontWeight: '600' },
  selectOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginBottom: 10,
  },
  selectOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  selectOptionLabel: { fontSize: 15, fontWeight: '600' },
  selectOptionSubtitle: { fontSize: 12, marginTop: 4 },
  emptyModalText: { textAlign: 'center', fontSize: 13 },
  modalCloseBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseText: { fontSize: 14, fontWeight: '600' },
  toggleBtn: { backgroundColor: '#1F2937', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginBottom: 8 },
  toggleBtnActive: { backgroundColor: '#2563EB' },
  toggleBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
});

