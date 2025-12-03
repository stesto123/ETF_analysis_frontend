import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Dimensions, PanResponder, Animated, TextInput, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Target, MapPin, Globe2, ListChecks, SlidersHorizontal, LineChart } from 'lucide-react-native';

import ETFQueryForm from '@/components/Form/ETFQueryForm';
import ETFLineChart from '@/components/Chart/LineChart';
import VerticalBarChart from '@/components/Chart/VerticalBarChart';
import { getLineColor } from '@/utils/linePalette';
import { useTheme } from '@/components/common/ThemeProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import AreaChips, { GeographyOption as AreaChipGeographyOption } from '@/components/Filter/AreaChips';

import { apiService } from '@/services/api';
import {
  PricePoint,
  QueryParams,
  ChartDataPoint,
  GeographyGroupWithSnapshots,
  TickerSummary,
  SnapshotMetrics,
} from '@/types';
import { useChartSettings } from '@/components/common/ChartSettingsProvider';
import HelpTooltip from '@/components/common/HelpTooltip';
import { TOOLTIP_COPY } from '@/constants/tooltips';

type GeographyOption = AreaChipGeographyOption;
type DateRange = { start_date: string; end_date: string };
type SelectedMap = Record<number, TickerSummary>;
type PerformanceMode = 'sharpe' | 'sortino';
type BetaMode = 'world' | 'sp500';
type CorrelationMode = 'world' | 'sp500';

type MultiDataset = { label: string; data: number[]; colorHint?: 'up' | 'down'; ticker?: string };
// allow optional labels per dataset (shared across series)
type MultiDatasetWithLabels = MultiDataset & { labels?: string[] };

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

const parseYYYYMMDD = (n: number) => {
  const y = Math.floor(n / 10000);
  const m = Math.floor((n % 10000) / 100) - 1;
  const d = n % 100;
  return new Date(y, m, d);
};

const daysBetween = (a: Date, b: Date) => Math.max(1, Math.round((+b - +a) / 86400000));

const diffDays = (a: Date, b: Date) => Math.max(0, Math.floor((+b - +a) / 86400000));

const chooseBucketDays = (spanDays: number, maxPoints = 60) => {
  if (!Number.isFinite(spanDays) || spanDays <= 1) {
    return 1;
  }
  const target = Math.max(2, Math.round(maxPoints));
  const effectiveBuckets = Math.max(1, target - 1);
  return Math.max(1, Math.ceil(spanDays / effectiveBuckets));
};

const aggregateOnBuckets = (
  rows: PricePoint[],
  globalStart: Date,
  bucketDays: number,
  bucketCount: number,
  valueKey: keyof PricePoint = 'close_price'
): { data: number[]; upOrDown: 'up' | 'down' } => {
  const sorted = [...rows].sort((a, b) => a.calendar_id - b.calendar_id);
  const acc = Array.from({ length: bucketCount }, () => ({ sum: 0, cnt: 0 }));

  for (const r of sorted) {
    const d = parseYYYYMMDD(r.calendar_id);
    let idx = Math.floor(diffDays(globalStart, d) / bucketDays);
    if (idx < 0) idx = 0;
    if (idx >= bucketCount) idx = bucketCount - 1;
    const val = r[valueKey];
    const num = val != null && Number.isFinite(Number(val)) ? Number(val) : null;
    if (num != null) {
      const cell = acc[idx];
      cell.sum += num;
      cell.cnt += 1;
    }
  }

  const series: number[] = [];
  let prev = sorted.length && sorted[0][valueKey] != null && Number.isFinite(Number(sorted[0][valueKey])) ? Number(sorted[0][valueKey]) : 0;
  for (let i = 0; i < bucketCount; i++) {
    const cell = acc[i];
    if (cell.cnt > 0) {
      prev = cell.sum / cell.cnt;
      series.push(prev);
    } else {
      series.push(prev);
    }
  }

  const first = series[0] ?? 0;
  const last = series[series.length - 1] ?? first;
  const upOrDown: 'up' | 'down' = last >= first ? 'up' : 'down';
  return { data: series, upOrDown };
};

const clampIndex = (idx: number, length: number) => {
  if (length <= 0) return 0;
  if (idx < 0) return 0;
  if (idx >= length) return length - 1;
  return idx;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const mixChannel = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const mixColor = (fromHex: string, toHex: string, t: number) => {
  const parse = (hex: string) => {
    const cleaned = hex.replace('#', '');
    if (cleaned.length === 3) {
      return cleaned.split('').map((c) => parseInt(c + c, 16));
    }
    return [cleaned.slice(0, 2), cleaned.slice(2, 4), cleaned.slice(4, 6)].map((p) => parseInt(p, 16));
  };
  const [r1, g1, b1] = parse(fromHex);
  const [r2, g2, b2] = parse(toHex);
  const r = mixChannel(r1, r2, t);
  const g = mixChannel(g1, g2, t);
  const b = mixChannel(b1, b2, t);
  return `rgb(${r}, ${g}, ${b})`;
};

const buildDownsampleIndices = (length: number, target: number) => {
  if (!Number.isFinite(length) || length <= 0) return [];
  if (!Number.isFinite(target) || target <= 0) {
    return Array.from({ length }, (_, i) => i);
  }
  const roundedTarget = Math.max(1, Math.round(target));
  if (length <= roundedTarget) {
    return Array.from({ length }, (_, i) => i);
  }

  const steps = Math.max(1, roundedTarget - 1);
  const step = (length - 1) / steps;
  const indices: number[] = [];
  for (let i = 0; i < roundedTarget; i += 1) {
    indices.push(Math.round(i * step));
  }
  const unique = Array.from(new Set(indices.map((idx) => clampIndex(idx, length))));
  unique.sort((a, b) => a - b);
  return unique;
};

const sampleArrayByIndices = <T,>(source: T[], indices: number[]): T[] => {
  if (!Array.isArray(source) || source.length === 0) return [];
  if (!indices.length) return source.slice();
  return indices.map((idx) => source[clampIndex(idx, source.length)]);
};

const formatDisplayDate = (iso: string | undefined | null) => {
  if (!iso) return '';
  const parts = iso.split('-').map((p) => Number(p));
  if (parts.length < 3 || parts.some((p) => Number.isNaN(p) || p <= 0)) return iso;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

type MetricOption = {
  key: string;
  rawKey?: keyof SnapshotMetrics;
  label: string;
  format: 'percent' | 'number' | 'currency' | 'calendar' | 'datetime' | 'json';
  decimals?: number;
  colorMode?: 'signed' | 'neutral';
  category: 'metadata' | 'return' | 'volatility' | 'performance' | 'drawdown' | 'beta' | 'correlation';
  resolve?: (snap?: SnapshotMetrics | null) => unknown;
};

const BASE_METRIC_OPTIONS: MetricOption[] = [
  { key: 'snapshot_calendar_id', rawKey: 'snapshot_calendar_id', label: 'Snapshot date', format: 'calendar', colorMode: 'neutral', category: 'metadata' },
  { key: 'data_freshness', rawKey: 'data_freshness', label: 'Data freshness', format: 'datetime', colorMode: 'neutral', category: 'metadata' },
  { key: 'close_price', rawKey: 'close_price', label: 'Close', format: 'currency', decimals: 2, colorMode: 'neutral', category: 'metadata' },
  // Returns
  { key: 'return_1w', rawKey: 'return_1w', label: '1w return', format: 'percent', colorMode: 'signed', category: 'return' },
  { key: 'return_1m', rawKey: 'return_1m', label: '1m return', format: 'percent', colorMode: 'signed', category: 'return' },
  { key: 'return_3m', rawKey: 'return_3m', label: '3m return', format: 'percent', colorMode: 'signed', category: 'return' },
  { key: 'return_6m', rawKey: 'return_6m', label: '6m return', format: 'percent', colorMode: 'signed', category: 'return' },
  { key: 'return_ytd', rawKey: 'return_ytd', label: 'YTD return', format: 'percent', colorMode: 'signed', category: 'return' },
  { key: 'return_1y', rawKey: 'return_1y', label: '1y return', format: 'percent', colorMode: 'signed', category: 'return' },
  { key: 'return_2y', rawKey: 'return_2y', label: '2y return', format: 'percent', colorMode: 'signed', category: 'return' },
  { key: 'return_3y', rawKey: 'return_3y', label: '3y return', format: 'percent', colorMode: 'signed', category: 'return' },
  { key: 'return_5y', rawKey: 'return_5y', label: '5y return', format: 'percent', colorMode: 'signed', category: 'return' },
  { key: 'return_10y', rawKey: 'return_10y', label: '10y return', format: 'percent', colorMode: 'signed', category: 'return' },
  { key: 'return_20y', rawKey: 'return_20y', label: '20y return', format: 'percent', colorMode: 'signed', category: 'return' },
  // Volatility
  { key: 'volatility_1m', rawKey: 'volatility_1m', label: 'Vol 1m', format: 'percent', colorMode: 'neutral', category: 'volatility' },
  { key: 'volatility_3m', rawKey: 'volatility_3m', label: 'Vol 3m', format: 'percent', colorMode: 'neutral', category: 'volatility' },
  { key: 'volatility_6m', rawKey: 'volatility_6m', label: 'Vol 6m', format: 'percent', colorMode: 'neutral', category: 'volatility' },
  { key: 'volatility_1y', rawKey: 'volatility_1y', label: 'Vol 1y', format: 'percent', colorMode: 'neutral', category: 'volatility' },
  { key: 'volatility_2y', rawKey: 'volatility_2y', label: 'Vol 2y', format: 'percent', colorMode: 'neutral', category: 'volatility' },
  { key: 'volatility_3y', rawKey: 'volatility_3y', label: 'Vol 3y', format: 'percent', colorMode: 'neutral', category: 'volatility' },
  { key: 'volatility_5y', rawKey: 'volatility_5y', label: 'Vol 5y', format: 'percent', colorMode: 'neutral', category: 'volatility' },
  { key: 'volatility_10y', rawKey: 'volatility_10y', label: 'Vol 10y', format: 'percent', colorMode: 'neutral', category: 'volatility' },
  { key: 'volatility_20y', rawKey: 'volatility_20y', label: 'Vol 20y', format: 'percent', colorMode: 'neutral', category: 'volatility' },
  // Performance ratios (Sharpe + Sortino)
  { key: 'sharpe_3m', rawKey: 'sharpe_3m', label: 'Sharpe 3m', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sharpe_6m', rawKey: 'sharpe_6m', label: 'Sharpe 6m', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sharpe_1y', rawKey: 'sharpe_1y', label: 'Sharpe 1y', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sharpe_2y', rawKey: 'sharpe_2y', label: 'Sharpe 2y', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sharpe_3y', rawKey: 'sharpe_3y', label: 'Sharpe 3y', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sharpe_5y', rawKey: 'sharpe_5y', label: 'Sharpe 5y', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sharpe_10y', rawKey: 'sharpe_10y', label: 'Sharpe 10y', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sharpe_20y', rawKey: 'sharpe_20y', label: 'Sharpe 20y', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sortino_3m', rawKey: 'sortino_3m', label: 'Sortino 3m', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sortino_6m', rawKey: 'sortino_6m', label: 'Sortino 6m', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sortino_1y', rawKey: 'sortino_1y', label: 'Sortino 1y', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sortino_2y', rawKey: 'sortino_2y', label: 'Sortino 2y', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sortino_3y', rawKey: 'sortino_3y', label: 'Sortino 3y', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sortino_5y', rawKey: 'sortino_5y', label: 'Sortino 5y', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sortino_10y', rawKey: 'sortino_10y', label: 'Sortino 10y', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  { key: 'sortino_20y', rawKey: 'sortino_20y', label: 'Sortino 20y', format: 'number', decimals: 2, colorMode: 'signed', category: 'performance' },
  // Drawdown
  { key: 'max_drawdown_1y', rawKey: 'max_drawdown_1y', label: 'Max DD 1y', format: 'percent', colorMode: 'signed', category: 'drawdown' },
  { key: 'max_drawdown_3y', rawKey: 'max_drawdown_3y', label: 'Max DD 3y', format: 'percent', colorMode: 'signed', category: 'drawdown' },
  { key: 'max_drawdown_5y', rawKey: 'max_drawdown_5y', label: 'Max DD 5y', format: 'percent', colorMode: 'signed', category: 'drawdown' },
  { key: 'max_drawdown_10y', rawKey: 'max_drawdown_10y', label: 'Max DD 10y', format: 'percent', colorMode: 'signed', category: 'drawdown' },
  { key: 'max_drawdown_20y', rawKey: 'max_drawdown_20y', label: 'Max DD 20y', format: 'percent', colorMode: 'signed', category: 'drawdown' },
  // Betas (world + S&P 500)
  { key: 'beta_world_1y', rawKey: 'beta_world_1y', label: 'Beta world 1y', format: 'number', decimals: 2, colorMode: 'neutral', category: 'beta' },
  { key: 'beta_world_2y', rawKey: 'beta_world_2y', label: 'Beta world 2y', format: 'number', decimals: 2, colorMode: 'neutral', category: 'beta' },
  { key: 'beta_world_3y', rawKey: 'beta_world_3y', label: 'Beta world 3y', format: 'number', decimals: 2, colorMode: 'neutral', category: 'beta' },
  { key: 'beta_world_5y', rawKey: 'beta_world_5y', label: 'Beta world 5y', format: 'number', decimals: 2, colorMode: 'neutral', category: 'beta' },
  { key: 'beta_world_10y', rawKey: 'beta_world_10y', label: 'Beta world 10y', format: 'number', decimals: 2, colorMode: 'neutral', category: 'beta' },
  { key: 'beta_world_20y', rawKey: 'beta_world_20y', label: 'Beta world 20y', format: 'number', decimals: 2, colorMode: 'neutral', category: 'beta' },
  { key: 'beta_sp500_1y', rawKey: 'beta_sp500_1y', label: 'Beta S&P 1y', format: 'number', decimals: 2, colorMode: 'neutral', category: 'beta' },
  { key: 'beta_sp500_2y', rawKey: 'beta_sp500_2y', label: 'Beta S&P 2y', format: 'number', decimals: 2, colorMode: 'neutral', category: 'beta' },
  { key: 'beta_sp500_3y', rawKey: 'beta_sp500_3y', label: 'Beta S&P 3y', format: 'number', decimals: 2, colorMode: 'neutral', category: 'beta' },
  { key: 'beta_sp500_5y', rawKey: 'beta_sp500_5y', label: 'Beta S&P 5y', format: 'number', decimals: 2, colorMode: 'neutral', category: 'beta' },
  { key: 'beta_sp500_10y', rawKey: 'beta_sp500_10y', label: 'Beta S&P 10y', format: 'number', decimals: 2, colorMode: 'neutral', category: 'beta' },
  { key: 'beta_sp500_20y', rawKey: 'beta_sp500_20y', label: 'Beta S&P 20y', format: 'number', decimals: 2, colorMode: 'neutral', category: 'beta' },
];

type MetricCategoryId = MetricOption['category'];
type MetricCategory = { id: MetricCategoryId; label: string; description?: string; metrics: string[] };

const CATEGORY_DEFS: Array<Omit<MetricCategory, 'metrics'>> = [
  { id: 'return', label: 'Returns', description: 'Performance across horizons' },
  { id: 'volatility', label: 'Volatility', description: 'Rolling volatility windows' },
  { id: 'performance', label: 'Performance ratios', description: 'Sharpe and Sortino ratios' },
  { id: 'drawdown', label: 'Max drawdown', description: 'Maximum drawdown windows' },
  { id: 'beta', label: 'Beta', description: 'Betas vs World and S&P 500' },
  { id: 'correlation', label: 'Correlations', description: 'Historical correlations by year' },
  { id: 'metadata', label: 'Snapshot info', description: 'Calendar, freshness, latest close' },
];

type MetricKey = string;
const DEFAULT_METRIC_KEYS: MetricKey[] = [
  'return_3m',
  'return_6m',
  'return_1y',
  'return_3y',
  'return_5y',
  'return_10y',
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { maxPoints } = useChartSettings();
  const prevMaxPointsRef = useRef(maxPoints);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [geographies, setGeographies] = useState<GeographyGroupWithSnapshots[]>([]);
  const geographyOptions = useMemo<GeographyOption[]>(
    () =>
      geographies.map(({ geography_id, geography_name, continent, country, iso_code }) => ({
        geography_id,
        geography_name,
        continent,
        country,
        iso_code,
      })),
    [geographies]
  );
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [tickers, setTickers] = useState<TickerSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tickersLoading, setTickersLoading] = useState(false);
  const [snapshots, setSnapshots] = useState<Record<number, SnapshotMetrics>>({});
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  // Pagination state (ticker panel uses the maximum height by default)
  const PAGE_SIZE = 30;
  const [page, setPage] = useState(0);
  const screenH = Dimensions.get('window').height;
  const tickerListHeight = Math.round(screenH * 0.88);
  const scrollRef = useRef<ScrollView>(null);
  const [searchOffset, setSearchOffset] = useState(0);
  const searchInputRef = useRef<TextInput>(null);

  const filteredTickers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tickers;
    return tickers.filter((t) => {
      const name = (t.name || '').toString().toLowerCase();
      const symbol = (t.symbol || '').toString().toLowerCase();
      const asset = (t.asset_class || '').toString().toLowerCase();
      return name.includes(q) || symbol.includes(q) || asset.includes(q);
    });
  }, [tickers, searchQuery]);


  // Derived paginated slice
  const pagedTickers = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredTickers.slice(start, start + PAGE_SIZE);
  }, [filteredTickers, page]);

  // Clamp page when filtered length changes
  useEffect(() => {
    const maxPage = Math.max(0, Math.floor((filteredTickers.length - 1) / PAGE_SIZE));
    if (page > maxPage) setPage(0);
  }, [filteredTickers.length, page]);

  useEffect(() => { setPage(0); }, [selectedArea, searchQuery]);

  const canPrev = page > 0;
  const maxPage = Math.max(0, Math.floor((filteredTickers.length - 1) / PAGE_SIZE));
  const canNext = page < maxPage;


  const [selectedTickers, setSelectedTickers] = useState<SelectedMap>({});
  const [metricModalVisible, setMetricModalVisible] = useState(false);
  const [selectedMetricKeys, setSelectedMetricKeys] = useState<MetricKey[]>(DEFAULT_METRIC_KEYS);
  const [correlationYears, setCorrelationYears] = useState<number[]>([]);
  const [hiddenBars, setHiddenBars] = useState<Set<number>>(new Set());

  // per grafico unico
  const [multiDatasets, setMultiDatasets] = useState<MultiDatasetWithLabels[] | null>(null);

  const [lastRange, setLastRange] = useState<DateRange | null>(null);
  const [chartMode, setChartMode] = useState<'price' | 'cumulative'>('price');
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('sharpe');
  const [betaMode, setBetaMode] = useState<BetaMode>('world');
  const [correlationMode, setCorrelationMode] = useState<CorrelationMode>('world');
  const [visibleBarCategories, setVisibleBarCategories] = useState<MetricCategoryId[]>(['return']);

  // Stable selection order: sort by display name (nome || ticker)
  const selectedArray = useMemo(() => {
    const arr = Object.values(selectedTickers);
    return arr.sort((a, b) => {
      const an = (a.name || a.symbol || '').toString();
      const bn = (b.name || b.symbol || '').toString();
      return an.localeCompare(bn);
    });
  }, [selectedTickers]);
  // Map from ticker_id to palette index to mirror chart series order/colors
  const selectedIndexById = useMemo(() => {
    const m = new Map<number, number>();
    selectedArray.forEach((t, i) => m.set(t.ticker_id, i));
    return m;
  }, [selectedArray]);

  const selectedCount = useMemo(() => Object.keys(selectedTickers).length, [selectedTickers]);
  const filteredCount = filteredTickers.length;
  const totalTickers = tickers.length;
  const totalAreas = geographies.length;
  const currentAreaName = useMemo(() => {
    if (selectedArea == null) return 'All areas';
    const match = geographies.find((g) => g.geography_id === selectedArea);
    return match?.geography_name ?? 'Selected area';
  }, [geographies, selectedArea]);
  const lastRangeLabel = useMemo(() => {
    if (!lastRange) return 'Range not set';
    const start = formatDisplayDate(lastRange.start_date);
    const end = formatDisplayDate(lastRange.end_date);
    if (!start || !end) return `${lastRange.start_date} → ${lastRange.end_date}`;
    return `${start} → ${end}`;
  }, [lastRange]);
  const heroGradient = isDark ? ['#0F172A', '#1F2937', '#111827'] as const : ['#2563EB', '#1D4ED8', '#1E3A8A'] as const;
  const heroPillBackground = isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(255,255,255,0.18)';
  const heroPillBorder = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(255,255,255,0.45)';
  const contentBottomPadding = Math.max(32, insets.bottom + 24);
  const contentTopPadding = Math.max(18, insets.top + 6);
  const selectionStatLabel = totalTickers > 0 ? `${selectedCount}/${totalTickers} selected` : `${selectedCount} selected`;
  const areaStatLabel = totalAreas > 0 ? `${totalAreas} areas · ${lastRangeLabel}` : lastRangeLabel;
  const heroSubtitle = useMemo(() => {
    if (totalTickers === 0) return 'No ETFs available for this area. Try a different selection.';
    if (selectedCount > 0) return `You are tracking ${selectedCount} ETFs from ${currentAreaName}.`;
    return `Select ETFs to analyze the performance of ${currentAreaName}.`;
  }, [selectedCount, currentAreaName, totalTickers]);
  const tickersSubtitle = useMemo(() => {
    if (tickers.length === 0) return selectedArea == null ? 'No ETFs mapped yet' : 'No ETFs for this geography';
    if (searchQuery.trim()) {
      return filteredCount === 0
        ? `No results for "${searchQuery.trim()}"`
        : `${filteredCount} match${filteredCount > 1 ? 'es' : ''} · ${selectedCount} selected`;
    }
    return `${filteredCount} ETFs available · ${selectedCount} selected`;
  }, [tickers.length, filteredCount, selectedCount, selectedArea, searchQuery]);
  const querySubtitle = useMemo(() => {
    if (!lastRange) return 'Pick a date window and run your query';
    return `Last range: ${lastRangeLabel}`;
  }, [lastRange, lastRangeLabel]);
  const performanceSubtitle = useMemo(() => {
    if (loading) return 'Crunching the latest numbers...';
    if (error) return 'We hit a snag fetching the data';
    if (!multiDatasets || multiDatasets.length === 0) return 'Run a query to populate the charts';
    return `Comparing ${multiDatasets.length} dataset${multiDatasets.length > 1 ? 's' : ''}`;
  }, [loading, error, multiDatasets]);
  const metricOptions = useMemo(() => {
    const corrOpts = correlationYears.flatMap<MetricOption>((year) => [
      {
        key: `corr_world_${year}`,
        label: `Corr world ${year}`,
        format: 'number',
        decimals: 3,
        colorMode: 'neutral',
        category: 'correlation',
        resolve: (snap?: SnapshotMetrics | null) => snap?.corr_world_by_year?.[String(year)] ?? null,
      },
      {
        key: `corr_sp500_${year}`,
        label: `Corr S&P ${year}`,
        format: 'number',
        decimals: 3,
        colorMode: 'neutral',
        category: 'correlation',
        resolve: (snap?: SnapshotMetrics | null) => snap?.corr_sp500_by_year?.[String(year)] ?? null,
      },
    ]);
    return [...BASE_METRIC_OPTIONS, ...corrOpts];
  }, [correlationYears]);

  const metricCategories = useMemo<MetricCategory[]>(() => {
    return CATEGORY_DEFS.map((cat) => ({
      ...cat,
      metrics: metricOptions.filter((opt) => opt.category === cat.id).map((opt) => opt.key),
    })).filter((cat) => cat.metrics.length > 0);
  }, [metricOptions]);

  const selectedMetricOptions = useMemo(() => {
    const picked = metricOptions.filter((opt) => selectedMetricKeys.includes(opt.key));
    if (picked.length > 0) return picked;
    const fallback = metricOptions.filter((opt) => DEFAULT_METRIC_KEYS.includes(opt.key));
    return fallback.length ? fallback : metricOptions.slice(0, 4);
  }, [selectedMetricKeys, metricOptions]);
  const metricOptionByKey = useMemo(() => {
    const map = new Map<MetricKey, MetricOption>();
    metricOptions.forEach((opt) => map.set(opt.key, opt));
    return map;
  }, [metricOptions]);
  const metricsByCategory = useMemo(() => {
    const map = new Map<MetricCategoryId, MetricKey[]>();
    metricCategories.forEach((cat) => map.set(cat.id, cat.metrics));
    return map;
  }, [metricCategories]);
  const selectedMetricSummary = useMemo(() => {
    const labels = selectedMetricOptions.map((m) => m.label);
    if (labels.length <= 3) return labels.join(', ') || 'None selected';
    return `${labels.slice(0, 3).join(', ')} +${labels.length - 3} more`;
  }, [selectedMetricOptions]);

  // Metric options dedicated to bar charts (exclude metadata) using full catalog
  const barMetricOptions = useMemo(
    () => metricOptions.filter((m) => m.category !== 'metadata'),
    [metricOptions]
  );
  const barMetricOptionsByKey = useMemo(() => {
    const map = new Map<MetricKey, MetricOption>();
    barMetricOptions.forEach((opt) => map.set(opt.key, opt));
    return map;
  }, [barMetricOptions]);
  const barMetricCategories = useMemo<MetricCategory[]>(() => {
    return CATEGORY_DEFS.filter((cat) => cat.id !== 'metadata')
      .map((cat) => ({
        ...cat,
        metrics: barMetricOptions.filter((opt) => opt.category === cat.id).map((opt) => opt.key),
      }))
      .filter((cat) => cat.metrics.length > 0);
  }, [barMetricOptions]);
  const barMetricsByCategory = useMemo(() => {
    const map = new Map<MetricCategoryId, MetricKey[]>();
    barMetricCategories.forEach((cat) => map.set(cat.id, cat.metrics));
    return map;
  }, [barMetricCategories]);
  const visibleBarMetricCategories = useMemo(
    () => barMetricCategories.filter((cat) => visibleBarCategories.includes(cat.id)),
    [barMetricCategories, visibleBarCategories]
  );

  useEffect(() => {
    setVisibleBarCategories((prev) => {
      const allowed = barMetricCategories.map((c) => c.id);
      const filtered = prev.filter((id) => allowed.includes(id));
      if (filtered.length) return filtered;
      return allowed.length ? [allowed[0]] : [];
    });
  }, [barMetricCategories]);

  const getShortLabel = useCallback((metric: MetricOption) => {
    const k = metric.key.toLowerCase();
    const labelLower = metric.label.toLowerCase();
    if (k.startsWith('return_')) {
      const suffix = k.replace('return_', '');
      if (suffix === 'ytd') return 'YTD';
      return suffix.toUpperCase();
    }
    if (k.startsWith('volatility_') || labelLower.startsWith('vol ')) {
      const suffix = labelLower.startsWith('vol ')
        ? metric.label.slice(4)
        : k.replace('volatility_', '');
      return suffix;
    }
    if (labelLower.startsWith('sharpe ')) return metric.label.replace('Sharpe ', '');
    if (labelLower.startsWith('sortino ')) return metric.label.replace('Sortino ', '');
    if (k.startsWith('corr_world_')) {
      return `W ${k.replace('corr_world_', '')}`;
    }
    if (k.startsWith('corr_sp500_')) {
      return `S ${k.replace('corr_sp500_', '')}`;
    }
    if (k.startsWith('max_drawdown_')) return k.replace('max_drawdown_', '');
    if (labelLower.startsWith('max dd ')) return metric.label.replace(/^Max DD\s*/i, '');
    if (k.startsWith('beta_world_')) return k.replace('beta_world_', '');
    if (k.startsWith('beta_sp500_')) return k.replace('beta_sp500_', '');
    return metric.label;
  }, []);

  const getCategoryLabel = useCallback((id: MetricCategoryId) => {
    switch (id) {
      case 'return':
        return 'Return';
      case 'volatility':
        return 'Vol';
      case 'performance':
        return 'Perf';
      case 'drawdown':
        return 'Drawdown';
      case 'beta':
        return 'Beta';
      case 'correlation':
        return 'Corr';
      case 'metadata':
      default:
        return 'Info';
    }
  }, []);

  const preferenceForMetric = useCallback((metric: MetricOption): 'higher' | 'lower' | 'neutral' => {
    if (metric.category === 'return' || metric.category === 'performance') return 'higher';
    if (metric.category === 'volatility' || metric.category === 'drawdown') return 'lower';
    if (metric.category === 'correlation') return 'lower';
    return 'neutral';
  }, []);

  const colorForValue = useCallback(
    (value: unknown, metric: MetricOption, min: number, max: number) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || !Number.isFinite(min) || !Number.isFinite(max) || min === max) {
        return colors.text;
      }
      let t = clamp01((numeric - min) / (max - min));
      const pref = preferenceForMetric(metric);
      if (pref === 'lower') {
        t = 1 - t;
      } else if (pref === 'neutral') {
        return colors.text;
      }
      return mixColor('#ef4444', '#22c55e', t);
    },
    [colors.text, preferenceForMetric]
  );

  const getMetricValue = useCallback(
    (snap: SnapshotMetrics | null | undefined, metric: MetricOption) => {
      if (!snap) return null;
      if (metric.resolve) return metric.resolve(snap);
      if (metric.rawKey) {
        return (snap as any)[metric.rawKey];
      }
      return (snap as any)[metric.key];
    },
    []
  );

  const comparisonRows = useMemo(() => {
    const relevant = selectedMetricOptions.filter(
      (m) => m.category === 'return' || m.category === 'correlation'
    );
    return relevant.map((metric) => {
      const values = selectedArray.map((ticker) => {
        const snap = snapshots[ticker.ticker_id];
        return getMetricValue(snap, metric);
      });
      const numeric = values
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v));
      const min = numeric.length ? Math.min(...numeric) : NaN;
      const max = numeric.length ? Math.max(...numeric) : NaN;
      return { metric, values, min, max };
    });
  }, [selectedMetricOptions, selectedArray, snapshots, getMetricValue]);

  // Selezione metriche per ogni categoria (un grafico dedicato per categoria)
  const [barSelections, setBarSelections] = useState<Record<MetricCategoryId, MetricKey[]>>({});
  const [barCategoryExpanded, setBarCategoryExpanded] = useState<Record<MetricCategoryId, boolean>>({});
  const isPerformanceKeyForMode = useCallback(
    (key: MetricKey, mode: PerformanceMode) => {
      const lower = key.toLowerCase();
      if (mode === 'sharpe') return lower.startsWith('sharpe_');
      return lower.startsWith('sortino_');
    },
    []
  );
  const isBetaKeyForMode = useCallback((key: MetricKey, mode: BetaMode) => {
    const lower = key.toLowerCase();
    if (mode === 'world') return lower.startsWith('beta_world_');
    return lower.startsWith('beta_sp500_');
  }, []);
  const isCorrelationKeyForMode = useCallback((key: MetricKey, mode: CorrelationMode) => {
    const lower = key.toLowerCase();
    if (mode === 'world') return lower.startsWith('corr_world_');
    return lower.startsWith('corr_sp500_');
  }, []);

  useEffect(() => {
    setBarSelections((prev) => {
      const next: Record<MetricCategoryId, MetricKey[]> = {};
      barMetricCategories.forEach((cat) => {
        const available = (cat.metrics as MetricKey[]) ?? [];
        const existing = prev[cat.id] ?? [];
        const filtered = existing.filter((k) => available.includes(k));
        if (cat.id === 'performance') {
          const modeAvail = available.filter((k) => isPerformanceKeyForMode(k, performanceMode));
          const filteredMode = filtered.filter((k) => modeAvail.includes(k));
          const fallback = modeAvail.slice(0, Math.min(modeAvail.length, 4));
          next[cat.id] = filteredMode.length ? filteredMode : fallback;
        } else if (cat.id === 'beta') {
          const modeAvail = available.filter((k) => isBetaKeyForMode(k, betaMode));
          const filteredMode = filtered.filter((k) => modeAvail.includes(k));
          const fallback = modeAvail.slice(0, Math.min(modeAvail.length, 4));
          next[cat.id] = filteredMode.length ? filteredMode : fallback;
        } else if (cat.id === 'correlation') {
          const modeAvail = available.filter((k) => isCorrelationKeyForMode(k, correlationMode));
          const filteredMode = filtered.filter((k) => modeAvail.includes(k));
          const fallback = modeAvail.slice(0, Math.min(modeAvail.length, 4));
          next[cat.id] = filteredMode.length ? filteredMode : fallback;
        } else {
          const fallback = available.slice(0, Math.min(available.length, 4));
          next[cat.id] = filtered.length ? filtered : fallback;
        }
      });
      return next;
    });
  }, [barMetricCategories, isPerformanceKeyForMode, performanceMode, isBetaKeyForMode, betaMode, isCorrelationKeyForMode, correlationMode]);

  const toggleBarMetric = useCallback(
    (categoryId: MetricCategoryId, key: MetricKey) => {
      setBarSelections((prev) => {
        const available = barMetricsByCategory.get(categoryId) ?? [];
        const filteredAvailable =
          categoryId === 'performance'
            ? available.filter((k) => isPerformanceKeyForMode(k, performanceMode))
            : categoryId === 'beta'
            ? available.filter((k) => isBetaKeyForMode(k, betaMode))
            : categoryId === 'correlation'
            ? available.filter((k) => isCorrelationKeyForMode(k, correlationMode))
            : available;
        const current = (prev[categoryId] ?? []).filter((k) => available.includes(k));
        const exists = current.includes(key);
        const next = exists ? current.filter((k) => k !== key) : [...current, key];
        const cleaned = next.filter((k) => filteredAvailable.includes(k));
        return { ...prev, [categoryId]: cleaned };
      });
    },
    [barMetricsByCategory, isPerformanceKeyForMode, performanceMode, isBetaKeyForMode, betaMode, isCorrelationKeyForMode, correlationMode]
  );

  const toggleBarCategory = useCallback(
    (categoryId: MetricCategoryId) => {
      const catMetrics = barMetricsByCategory.get(categoryId) ?? [];
      const filteredMetrics =
        categoryId === 'performance'
          ? catMetrics.filter((k) => isPerformanceKeyForMode(k, performanceMode))
          : categoryId === 'beta'
          ? catMetrics.filter((k) => isBetaKeyForMode(k, betaMode))
          : categoryId === 'correlation'
          ? catMetrics.filter((k) => isCorrelationKeyForMode(k, correlationMode))
          : catMetrics;
      if (!filteredMetrics.length) return;
      setBarSelections((prev) => {
        const current = prev[categoryId] ?? [];
        const allSelected = filteredMetrics.every((k) => current.includes(k as MetricKey));
        const next = allSelected ? current.filter((k) => !filteredMetrics.includes(k)) : Array.from(new Set([...current, ...filteredMetrics]));
        return { ...prev, [categoryId]: next as MetricKey[] };
      });
    },
    [barMetricsByCategory, isPerformanceKeyForMode, performanceMode, isBetaKeyForMode, betaMode, isCorrelationKeyForMode, correlationMode]
  );

  const resetBarCategory = useCallback(
    (categoryId: MetricCategoryId) => {
      const metrics = barMetricsByCategory.get(categoryId) ?? [];
      const filteredMetrics =
        categoryId === 'performance'
          ? metrics.filter((k) => isPerformanceKeyForMode(k, performanceMode))
          : categoryId === 'beta'
          ? metrics.filter((k) => isBetaKeyForMode(k, betaMode))
          : categoryId === 'correlation'
          ? metrics.filter((k) => isCorrelationKeyForMode(k, correlationMode))
          : metrics;
      const fallback = filteredMetrics.slice(0, Math.min(filteredMetrics.length, 4));
      setBarSelections((prev) => ({ ...prev, [categoryId]: fallback as MetricKey[] }));
    },
    [barMetricsByCategory, isPerformanceKeyForMode, performanceMode, isBetaKeyForMode, betaMode, isCorrelationKeyForMode, correlationMode]
  );

  const toggleBarExpansion = useCallback((categoryId: MetricCategoryId) => {
    setBarCategoryExpanded((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }, []);

  const toggleVisibleBarCategory = useCallback((categoryId: MetricCategoryId) => {
    setVisibleBarCategories((prev) => {
      const exists = prev.includes(categoryId);
      if (exists) return prev.filter((id) => id !== categoryId);
      return [...prev, categoryId];
    });
  }, []);

  const buildBarSeries = useCallback(
    (metricKeys: MetricKey[]) => {
      return metricKeys
        .map((key) => barMetricOptionsByKey.get(key))
        .filter(Boolean)
        .map((metric) => {
          const values = selectedArray.map((t) => ({
            id: t.ticker_id,
            label: t.name || t.symbol || String(t.ticker_id),
            value: getMetricValue(snapshots[t.ticker_id], metric!),
            colorIndex: selectedIndexById.get(t.ticker_id) ?? 0,
          }));
          const numeric = values.map((v) => Number(v.value)).filter((v) => Number.isFinite(v));
          const min = numeric.length ? Math.min(...numeric) : NaN;
          const max = numeric.length ? Math.max(...numeric) : NaN;
          return { metric: metric!, values, min, max, format: (v: unknown) => formatMetricValue(v, metric!) };
        })
        .filter(Boolean) as Array<{
          metric: MetricOption;
          values: Array<{ id: number; label: string; value: unknown; colorIndex: number }>;
          min: number;
          max: number;
          format: (v: unknown) => string;
        }>;
    },
    [barMetricOptionsByKey, selectedArray, snapshots, getMetricValue, selectedIndexById, formatMetricValue]
  );

  const formatMetricValue = useCallback((value: unknown, option: MetricOption) => {
    if (value == null) return '�?"';

    if (option.format === 'calendar') {
      const num = Number(value);
      if (!Number.isFinite(num)) return '�?"';
      const y = Math.floor(num / 10000);
      const m = Math.floor((num % 10000) / 100);
      const d = num % 100;
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }

    if (option.format === 'datetime') {
      const date = new Date(value as any);
      if (Number.isNaN(+date)) return '�?"';
      return date.toLocaleString();
    }

    if (option.format === 'json') {
      if (typeof value === 'object' && value !== null) {
        const keys = Object.keys(value as Record<string, unknown>).length;
        return `${keys} yr`;
      }
      try {
        const parsed = JSON.parse(String(value));
        if (parsed && typeof parsed === 'object') {
          const keys = Object.keys(parsed as Record<string, unknown>).length;
          return `${keys} yr`;
        }
      } catch {
        /* ignore */
      }
      return '�?"';
    }

    if (option.format === 'currency') {
      const num = Number(value);
      if (!Number.isFinite(num)) return '�?"';
      const decimals = option.decimals ?? 2;
      return `$${num.toFixed(decimals)}`;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '�?"';

    if (option.format === 'percent') {
      const pct = numeric * 100;
      const abs = Math.abs(pct);
      const decimals = option.decimals ?? (abs >= 100 ? 0 : abs >= 10 ? 1 : 2);
      const sign = pct > 0 ? '+' : '';
      return `${sign}${pct.toFixed(decimals)}%`;
    }

    const decimals = option.decimals ?? 2;
    return numeric.toFixed(decimals);
  }, []);

  const resolveMetricColors = useCallback(
    (value: unknown, option: MetricOption) => {
      const mode = option.colorMode ?? 'signed';
      const numeric = Number(value);
      const isNumeric = Number.isFinite(numeric);
      if (!isNumeric || mode === 'neutral') {
        return {
          backgroundColor: colors.background,
          borderColor: colors.border,
          textColor: colors.text,
        };
      }
      const positive = numeric >= 0;
      return positive
        ? {
            backgroundColor: 'rgba(34,197,94,0.12)',
            borderColor: 'rgba(34,197,94,0.36)',
            textColor: '#16A34A',
          }
        : {
            backgroundColor: 'rgba(239,68,68,0.12)',
            borderColor: 'rgba(239,68,68,0.36)',
            textColor: '#DC2626',
          };
    },
    [colors.background, colors.border, colors.text]
  );

  const renderSectionCard = ({
    icon: Icon,
    accent,
    title,
    subtitle,
    rightAccessory,
    children,
  }: {
    icon: React.ComponentType<{ size?: number; color?: string }>;
    accent: string;
    title: string;
    subtitle?: string;
    rightAccessory?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.cardIconWrap, { backgroundColor: friendlyAccent(accent) }]}> 
            <Icon size={20} color={accent} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>{subtitle}</Text> : null}
          </View>
        </View>
        {rightAccessory}
      </View>
      <View style={styles.cardContent}>{children}</View>
    </View>
  );

  // responsive sizing (kept for possible future use)
  // const screenHeight = Dimensions.get('window').height;
  // const priceChartHeight = Math.min(260, Math.max(160, Math.round(screenHeight * 0.28)));
  // const cumChartHeight = Math.min(200, Math.max(140, Math.round(screenHeight * 0.22)));
  // main list acts as ticker list; no nested virtualization

  useEffect(() => {
    let cancelled = false;
    setTickersLoading(true);
    setSnapshotsLoading(true);
    setSnapshotsError(null);
    setSnapshots({});
    apiService
      .getGeographiesWithSnapshots(true)
      .then((items) => {
        if (cancelled) return;
        setGeographies(items);
        const map: Record<number, SnapshotMetrics> = {};
        items.forEach((group) => {
          group.tickers.forEach((ticker) => {
            if (ticker.snapshot) {
              map[ticker.ticker_id] = ticker.snapshot;
            }
          });
        });
        setSnapshots(map);
        setSnapshotsError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setGeographies([]);
        setSnapshots({});
        setSnapshotsError(err instanceof Error ? err.message : 'Unable to load tickers and snapshots');
      })
      .finally(() => {
        if (!cancelled) {
          setTickersLoading(false);
          setSnapshotsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const years = new Set<number>();
    Object.values(snapshots).forEach((snap) => {
      const collect = (obj?: Record<string, number | null>) => {
        if (!obj) return;
        Object.keys(obj).forEach((k) => {
          const n = Number(k);
          if (Number.isFinite(n)) years.add(n);
        });
      };
      collect(snap?.corr_world_by_year || undefined);
      collect(snap?.corr_sp500_by_year || undefined);
    });
    setCorrelationYears(Array.from(years).sort((a, b) => a - b));
  }, [snapshots]);

  // Aggiorna l'elenco dei ticker in base all'area selezionata
  useEffect(() => {
    if (geographies.length === 0) {
      setTickers([]);
      return;
    }

    if (selectedArea == null) {
      const map = new Map<number, TickerSummary>();
      geographies.forEach((group) => {
        group.tickers.forEach((ticker) => {
          if (ticker && typeof ticker.ticker_id === 'number' && !map.has(ticker.ticker_id)) {
            map.set(ticker.ticker_id, ticker);
          }
        });
      });
      const merged = Array.from(map.values()).sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
      setTickers(merged);
    } else {
      const group = geographies.find((g) => g.geography_id === selectedArea);
      const list = group ? [...group.tickers].sort((a, b) => (a.symbol || '').localeCompare(b.symbol || '')) : [];
      setTickers(list);
    }
  }, [geographies, selectedArea]);

  // ===== Selezione ETF (toggle) =====
  const toggleSelect = (t: TickerSummary) => {
    setSelectedTickers((prev) => {
      const next = { ...prev };
      if (next[t.ticker_id]) delete next[t.ticker_id];
      else next[t.ticker_id] = t;
      return next;
    });
  };

  const allCurrentSelected = useMemo(() => {
    if (filteredTickers.length === 0) return false;
    return filteredTickers.every((t) => !!selectedTickers[t.ticker_id]);
  }, [filteredTickers, selectedTickers]);

  const toggleSelectAllInArea = () => {
    setSelectedTickers((prev) => {
      const next: SelectedMap = { ...prev };
      if (allCurrentSelected) {
        filteredTickers.forEach((t) => delete next[t.ticker_id]);
      } else {
        filteredTickers.forEach((t) => {
          next[t.ticker_id] = t;
        });
      }
      return next;
    });
  };

  const toggleMetric = useCallback((key: MetricKey) => {
    setSelectedMetricKeys((prev) => {
      const exists = prev.includes(key);
      if (exists) {
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  }, []);

  const toggleCategory = useCallback(
    (categoryId: MetricCategoryId) => {
      const catMetrics = metricsByCategory.get(categoryId) ?? [];
      setSelectedMetricKeys((prev) => {
        if (!catMetrics.length) return prev;
        const allSelected = catMetrics.every((k) => prev.includes(k));
        if (allSelected) {
          return prev.filter((k) => !catMetrics.includes(k));
        }
        const next = [...prev];
        catMetrics.forEach((k) => {
          if (!next.includes(k)) next.push(k);
        });
        return next;
      });
    },
    [metricsByCategory]
  );

  const resetMetrics = useCallback(() => {
    setSelectedMetricKeys(DEFAULT_METRIC_KEYS);
  }, []);

  const toggleBarVisibility = useCallback((id: number) => {
    setHiddenBars((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const [cumDatasets, setCumDatasets] = useState<MultiDatasetWithLabels[] | null>(null);

  // ===== Fetch selezionati -> build datasets unificati =====
  const fetchSelected = useCallback(
    async (range: DateRange, useCache: boolean = true) => {
      const toLoad = Object.values(selectedTickers);
      if (toLoad.length === 0) return;

      setLoading(true);
      setError(null);

      try {
        const toLoadOrdered = Object.values(selectedTickers).sort((a, b) => {
          const an = (a.name || a.symbol || '').toString();
          const bn = (b.name || b.symbol || '').toString();
          return an.localeCompare(bn);
        });

        const tickerIds = toLoadOrdered.map((t) => t.ticker_id);
        const seriesList = await apiService.fetchETFData(
          {
            tickerIds,
            startCalendarId: range.start_date,
            endCalendarId: range.end_date,
          },
          useCache
        );
        const seriesMap = new Map<number, PricePoint[]>(
          seriesList.map((series) => [series.ticker_id, series.points ?? []])
        );
        const results = toLoadOrdered.map((t) => ({ t, rows: seriesMap.get(t.ticker_id) ?? [] }));

        let minCal = Infinity;
        let maxCal = -Infinity;
        results.forEach(({ rows }) => {
          if (!rows.length) return;
          const first = rows.reduce((m, r) => Math.min(m, r.calendar_id), rows[0].calendar_id);
          const last = rows.reduce((m, r) => Math.max(m, r.calendar_id), rows[0].calendar_id);
          minCal = Math.min(minCal, first);
          maxCal = Math.max(maxCal, last);
        });

        if (!isFinite(minCal) || !isFinite(maxCal)) {
          setMultiDatasets(null);
          setLastRange(range);
          setLoading(false);
          return;
        }

    const globalStart = parseYYYYMMDD(minCal);
    const globalEnd = parseYYYYMMDD(maxCal);
    const spanDays = daysBetween(globalStart, globalEnd);
    const bucketDays = chooseBucketDays(spanDays, maxPoints);
    const bucketCount = Math.max(1, Math.ceil(spanDays / bucketDays) + 1);

        const buildLabel = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };
        const labels: string[] = [];
        for (let i = 0; i < bucketCount; i++) {
          const dt = new Date(globalStart.getTime() + i * bucketDays * 86400000);
          labels.push(buildLabel(dt));
        }

        const aggregated = results.map(({ t, rows }) => {
          const priceAgg = aggregateOnBuckets(rows, globalStart, bucketDays, bucketCount);
          const cumulativeAgg = aggregateOnBuckets(rows, globalStart, bucketDays, bucketCount, 'cumulative_return');
          const displayName = t.name || t.symbol;
          return {
            label: displayName,
            ticker: t.symbol,
            priceData: priceAgg.data,
            priceTrend: priceAgg.upOrDown,
            cumulativeData: cumulativeAgg.data,
            cumulativeTrend: cumulativeAgg.upOrDown,
          };
        });

        const keepIndices = buildDownsampleIndices(labels.length, maxPoints);
        const shouldSample = keepIndices.length > 0 && keepIndices.length < labels.length;
        const sharedLabels = shouldSample ? sampleArrayByIndices(labels, keepIndices) : labels.slice();
        const sampleSeries = (series: number[]) =>
          shouldSample ? sampleArrayByIndices(series, keepIndices) : series.slice();

        const datasets: MultiDatasetWithLabels[] = aggregated.map((series) => ({
          label: series.label,
          ticker: series.ticker,
          data: sampleSeries(series.priceData),
          colorHint: series.priceTrend,
          labels: sharedLabels,
        }));

        setMultiDatasets(datasets);

        // Popola cumDatasets direttamente dai dati ricevuti (cumulative_return)
        const cumDatasetsNew: MultiDatasetWithLabels[] = aggregated.map((series) => {
          const sampled = sampleSeries(series.cumulativeData);
          const dataPerc = sampled.map((v: number) => (Number.isFinite(v) ? v * 100 : 0));
          return {
            label: `${series.label} (%)`,
            ticker: series.ticker,
            data: dataPerc,
            colorHint: series.cumulativeTrend,
            labels: sharedLabels,
          };
        });
        setCumDatasets(cumDatasetsNew);
        setLastRange(range);
      } catch (e) {
  setMultiDatasets(null);
  setError(e instanceof Error ? e.message : 'Unexpected error while loading data');
      } finally {
        setLoading(false);
      }
    },
  [selectedTickers, maxPoints]
  );

  const handleSubmit = useCallback(
    (params: QueryParams) => {
      const range: DateRange = { start_date: params.start_date, end_date: params.end_date };
      fetchSelected(range, true);
    },
    [fetchSelected]
  );

  const handleRefresh = useCallback(async () => {
    if (!lastRange || Object.keys(selectedTickers).length === 0) return;
    setRefreshing(true);
    try {
      await fetchSelected(lastRange, false);
    } finally {
      setRefreshing(false);
    }
  }, [lastRange, selectedTickers, fetchSelected]);

  const handleRetry = () => {
    if (lastRange) fetchSelected(lastRange, false);
  };

  useEffect(() => {
    if (prevMaxPointsRef.current === maxPoints) return;
    prevMaxPointsRef.current = maxPoints;
    if (!lastRange) return;
    if (!Object.keys(selectedTickers).length) return;
    fetchSelected(lastRange, true);
  }, [maxPoints, lastRange, fetchSelected, selectedTickers]);

  const handleSearchFocus = useCallback(() => {
    const scrollView = scrollRef.current as unknown as { measure?: (...args: any[]) => void; scrollTo?: (...args: any[]) => void } | null;
    const input = searchInputRef.current as unknown as { measure?: (...args: any[]) => void } | null;
    if (!scrollView || !input || !scrollView.measure || !input.measure) {
      const fallbackY = Math.max(0, searchOffset - 12);
      scrollRef.current?.scrollTo?.({ y: fallbackY, animated: true });
      return;
    }

    requestAnimationFrame(() => {
      input.measure((_ix, _iy, _iw, _ih, _ipx, pageYInput) => {
        if (typeof pageYInput !== 'number') {
          const fallbackY = Math.max(0, searchOffset - 12);
          scrollView.scrollTo?.({ y: fallbackY, animated: true });
          return;
        }
        scrollView.measure((_sx, _sy, _sw, _sh, _spx, pageYScroll) => {
          const baseY = typeof pageYScroll === 'number' ? pageYScroll : 0;
          const relativeY = Math.max(0, pageYInput - baseY - 12);
          scrollView.scrollTo?.({ y: relativeY, animated: true });
        });
      });
    });
  }, [searchOffset]);

  

  // ===== RENDER HELPERS =====
  // main FlatList renders tickers; header & footer handle rest

  const renderChart = () => {
    if (loading && !refreshing) return <LoadingSpinner message="Fetching ETF data..." />;
    if (error) return <ErrorDisplay error={error} onRetry={handleRetry} />;

    if (!multiDatasets || multiDatasets.length === 0) {
      return (
        <EmptyState
          title="No data"
          message={
            Object.keys(selectedTickers).length === 0
              ? 'Select one or more ETFs from the list and set the dates.'
              : 'Press Fetch to load the chart for the selected ETFs.'
          }
        />
      );
    }

    if (chartMode === 'cumulative' && (!cumDatasets || cumDatasets.length === 0)) {
      return (
        <EmptyState
          title="No cumulative data"
          message="Run a query to compute cumulative returns for the selected ETFs."
        />
      );
    }

    const showCumulative = chartMode === 'cumulative';
    const activeMulti = showCumulative ? (cumDatasets ?? []) : multiDatasets;
    const chartHeight = showCumulative ? 220 : 230;
    const tickerLabel = showCumulative ? 'Cumulative Returns' : 'Selected ETFs';

    return (
      <ETFLineChart
        multi={activeMulti.map((ds) => ({
          label: ds.label,
          data: ds.data,
          colorHint: ds.colorHint,
          labels: ds.labels,
        }))}
        data={[] as unknown as ChartDataPoint[]}
        ticker={tickerLabel}
        height={chartHeight}
        yAxisFormat={showCumulative ? 'percent' : 'currency'}
        {...(!showCumulative ? { currencySymbol: '$' } : {})}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: contentBottomPadding, paddingTop: contentTopPadding },
        ]}
      >
        <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Sparkles size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>ETF Analytics</Text>
            <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
            <View style={styles.heroStatsRow}>
              <View style={[styles.heroStat, { backgroundColor: heroPillBackground, borderColor: heroPillBorder }]}>
                <Target size={16} color="#FFFFFF" />
                <Text style={styles.heroStatText}>
                  {selectionStatLabel}
                </Text>
              </View>
              <View style={[styles.heroStat, { backgroundColor: heroPillBackground, borderColor: heroPillBorder }]}>
                <MapPin size={16} color="#FFFFFF" />
                <Text style={styles.heroStatText}>
                  {areaStatLabel}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        {renderSectionCard({
          icon: Globe2,
          accent: '#38BDF8',
          title: 'Focus by geography',
          subtitle: `Currently viewing ${currentAreaName}`,
          rightAccessory: (
            <HelpTooltip
              title={TOOLTIP_COPY.analytics.areaFilter.title}
              description={TOOLTIP_COPY.analytics.areaFilter.description}
            />
          ),
          children: (
            <View style={styles.cardContentGap}>
              <AreaChips
                areas={geographyOptions}
                selectedId={selectedArea}
                onSelect={setSelectedArea}
                loading={tickersLoading}
              />
            </View>
          ),
        })}
        {renderSectionCard({
          icon: ListChecks,
          accent: '#A855F7',
          title: 'ETF library',
          subtitle: tickersSubtitle,
          rightAccessory: (
            <View style={[styles.cardBadge, { backgroundColor: colors.background }]}> 
              <Text style={[styles.cardBadgeText, { color: colors.text }]}>{filteredCount}</Text>
            </View>
          ),
          children: (
            <View style={styles.cardContentGap}>
              {tickersLoading ? (
                <Text style={[styles.tickersHint, { color: colors.secondaryText }]}>Loading ETFs...</Text>
              ) : tickers.length === 0 ? (
                <Text style={[styles.tickersHint, { color: colors.secondaryText }]}>
                  {selectedArea == null ? 'No active tickers assigned to geographies.' : 'No active tickers for this area.'}
                </Text>
              ) : (
                <>
                  {snapshotsLoading ? (
                    <Text style={[styles.tickersHint, { color: colors.secondaryText }]}>
                      Updating snapshot metrics...
                    </Text>
                  ) : snapshotsError ? (
                    <Text style={[styles.tickersHint, { color: colors.secondaryText }]}>
                      Snapshot metrics unavailable: {snapshotsError}
                    </Text>
                  ) : null}
                  <View
                    style={[styles.metricPicker, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <View style={styles.metricPickerHeader}>
                      <View style={styles.inlineHelpRow}>
                        <Text style={[styles.metricPickerTitle, { color: colors.text }]}>Metrics shown</Text>
                        <HelpTooltip
                          title={TOOLTIP_COPY.analytics.metricPicker.title}
                          description={TOOLTIP_COPY.analytics.metricPicker.description}
                        />
                      </View>
                      <Pressable
                        onPress={resetMetrics}
                        style={[styles.resetMetricsBtn, { borderColor: colors.border }]}
                      >
                        <Text style={[styles.resetMetricsText, { color: colors.secondaryText }]}>Reset</Text>
                      </Pressable>
                    </View>
                    <View style={styles.metricSummaryRow}>
                      <Text style={[styles.metricSummaryText, { color: colors.secondaryText }]}>
                        Selected {selectedMetricKeys.length}
                      </Text>
                      <Text
                        style={[styles.metricSummaryList, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {selectedMetricSummary}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setMetricModalVisible(true)}
                      style={[
                        styles.metricOpenBtn,
                        { borderColor: colors.border, backgroundColor: colors.card },
                      ]}
                    >
                      <Text style={[styles.metricOpenBtnText, { color: colors.text }]}>
                        Choose metrics by category
                      </Text>
                      <Text style={[styles.metricOpenBtnSub, { color: colors.secondaryText }]}>
                        Tap to open selector
                      </Text>
                    </Pressable>
                  </View>
                  <View
                    style={[styles.searchRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onLayout={(e) => setSearchOffset(e.nativeEvent.layout.y)}
                  >
                    <TextInput
                      ref={searchInputRef}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search ETF by name or symbol"
                      placeholderTextColor={colors.secondaryText}
                      style={[styles.searchInput, { color: colors.text }]}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                      onFocus={handleSearchFocus}
                    />
                  </View>
                  {filteredCount === 0 ? (
                    <Text style={[styles.tickersHint, { color: colors.secondaryText }]}>
                      {searchQuery.trim()
                        ? `No ETFs match "${searchQuery.trim()}".`
                        : 'No ETFs available.'}
                    </Text>
                  ) : (
                    <>
                      <View style={styles.bulkRow}>
                        <View style={styles.inlineHelpRow}>
                          <Pressable
                            onPress={toggleSelectAllInArea}
                            style={[styles.bulkBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                          >
                            <Text style={[styles.bulkBtnText, { color: colors.text }]}>
                              {allCurrentSelected ? 'Deselect all' : 'Select all'}
                            </Text>
                          </Pressable>
                          <HelpTooltip
                            title={TOOLTIP_COPY.analytics.bulkSelect.title}
                            description={TOOLTIP_COPY.analytics.bulkSelect.description}
                          />
                        </View>
                        <Text style={[styles.selectedCounter, { color: colors.secondaryText }]}>
                          Selected: {selectedCount}
                        </Text>
                      </View>
                      <View style={[styles.tickerScrollableContainer, { height: tickerListHeight, borderColor: colors.border, backgroundColor: colors.card }]}> 
                        <View style={styles.innerScrollWrapper}>
                          <ScrollView
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator
                            contentContainerStyle={{ paddingBottom: filteredTickers.length > PAGE_SIZE ? 72 : 16 }}
                          >
                            {pagedTickers.map((item, index) => {
                              const isSel = !!selectedTickers[item.ticker_id];
                              const selIdx = selectedIndexById.get(item.ticker_id);
                              const dotColor = isSel && selIdx !== undefined ? getLineColor(selIdx) : '#D1D5DB';
                              return (
                                <View key={item.ticker_id}>
                                  <Pressable onPress={() => toggleSelect(item)} style={[styles.tickerRow, isSel && { backgroundColor: friendlyAccent(colors.accent, 0.12), borderColor: colors.border }]}>
                                    <View style={styles.tickerHeader}>
                                      <View style={[styles.tickerDot, { backgroundColor: dotColor }]} />
                                      <View style={{ flex: 1 }}>
                                        <Text style={[styles.tickerName, { color: colors.text }]} numberOfLines={1}>
                                          {item.name || item.symbol}
                                        </Text>
                                        <Text style={[styles.tickerSubtitle, { color: colors.secondaryText }]} numberOfLines={1}>
                                          {item.symbol}
                                          {item.asset_class ? ` • ${item.asset_class}` : ''}
                                        </Text>
                                      </View>
                                      {isSel ? (
                                        <View style={[styles.selectionTag, { backgroundColor: friendlyAccent(colors.accent, 0.24), borderColor: colors.accent }]}>
                                          <Text style={[styles.selectionTagText, { color: colors.accent }]}>✓</Text>
                                        </View>
                                      ) : null}
                                    </View>
                                    <View style={styles.returnRow}>
                                      {metricCategories
                                        .map((cat) => ({
                                          cat,
                                          metrics: selectedMetricOptions.filter((m) => m.category === cat.id),
                                        }))
                                        .filter((entry) => entry.metrics.length > 0)
                                        .map(({ cat, metrics }) => (
                                          <View key={cat.id} style={styles.metricCategoryRow}>
                                            <Text style={[styles.metricCategoryLabel, { color: colors.secondaryText }]}>
                                              {getCategoryLabel(cat.id)}
                                            </Text>
                                            <View style={styles.metricChipsCompact}>
                                              {metrics.map((metric) => {
                                                const snap = snapshots[item.ticker_id];
                                                const rawVal = getMetricValue(snap, metric);
                                                const { backgroundColor, borderColor, textColor } = resolveMetricColors(
                                                  rawVal as number | null | undefined,
                                                  metric
                                                );
                                                return (
                                                  <View
                                                    key={metric.key}
                                                    style={[
                                                      styles.returnBadge,
                                                      { backgroundColor, borderColor },
                                                    ]}
                                                  >
                                                    <Text style={[styles.returnLabel, { color: colors.secondaryText }]}>
                                                      {getShortLabel(metric)}
                                                    </Text>
                                                    <Text style={[styles.returnValue, { color: textColor }]}>
                                                      {formatMetricValue(rawVal, metric)}
                                                    </Text>
                                                  </View>
                                                );
                                              })}
                                            </View>
                                          </View>
                                        ))}
                                    </View>
                                  </Pressable>
                                  {index < pagedTickers.length - 1 && (
                                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                                  )}
                                </View>
                              );
                            })}
                          </ScrollView>

                          {filteredTickers.length > PAGE_SIZE && (
                            <View style={[styles.paginationSticky, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                              <Pressable
                                disabled={!canPrev}
                                onPress={() => canPrev && setPage((p) => p - 1)}
                                style={[styles.pageBtn, { backgroundColor: colors.background, borderColor: colors.border }, !canPrev && styles.pageBtnDisabled]}
                              >
                                <Text style={[styles.pageBtnText, { color: colors.text }]}>{'<'}</Text>
                              </Pressable>
                              <Text style={[styles.pageIndicator, { color: colors.text }]}>
                                Page {page + 1} / {maxPage + 1}
                              </Text>
                              <Pressable
                                disabled={!canNext}
                                onPress={() => canNext && setPage((p) => p + 1)}
                                style={[styles.pageBtn, { backgroundColor: colors.background, borderColor: colors.border }, !canNext && styles.pageBtnDisabled]}
                              >
                                <Text style={[styles.pageBtnText, { color: colors.text }]}>{'>'}</Text>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          ),
        })}
        {renderSectionCard({
          icon: SlidersHorizontal,
          accent: '#F97316',
          title: 'Query settings',
          subtitle: querySubtitle,
          rightAccessory: (
            <HelpTooltip
              title={TOOLTIP_COPY.analytics.queryForm.title}
              description={TOOLTIP_COPY.analytics.queryForm.description}
            />
          ),
          children: (
            <View style={styles.cardContentGap}>
              <ETFQueryForm onSubmit={handleSubmit} loading={loading} />
            </View>
          ),
        })}
        {renderSectionCard({
          icon: LineChart,
          accent: '#22C55E',
          title: 'Performance overview',
          subtitle: performanceSubtitle,
          rightAccessory: (
            <HelpTooltip
              title={TOOLTIP_COPY.analytics.performanceChart.title}
              description={TOOLTIP_COPY.analytics.performanceChart.description}
            />
          ),
          children: (
            <View style={styles.cardContentGap}>
              <View style={[styles.chartToggleRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {(['price', 'cumulative'] as const).map((mode) => {
                  const active = chartMode === mode;
                  const label = mode === 'price' ? 'Price' : 'Cumulative';
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setChartMode(mode)}
                      style={[
                        styles.chartToggleBtn,
                        active && { backgroundColor: friendlyAccent(colors.accent, 0.24), borderColor: colors.accent },
                      ]}
                    >
                      <Text style={[styles.chartToggleText, { color: active ? colors.accent : colors.text }]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {renderChart()}
              {comparisonRows.length > 0 && selectedArray.length > 0 && (
                <View style={[styles.comparisonTableCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Text style={[styles.comparisonTitle, { color: colors.text }]}>
                    Snapshot comparison
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>
                      <View style={styles.comparisonHeaderRow}>
                        <Text style={[styles.comparisonHeaderCell, { color: colors.secondaryText }]}>Metric</Text>
                        {selectedArray.map((t) => (
                          <Text
                            key={t.ticker_id}
                            style={[styles.comparisonHeaderCell, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {t.symbol || t.name}
                          </Text>
                        ))}
                      </View>
                      {comparisonRows.map(({ metric, values, min, max }) => (
                        <View key={metric.key} style={styles.comparisonRow}>
                          <Text style={[styles.comparisonMetricCell, { color: colors.secondaryText }]} numberOfLines={1}>
                            {metric.label}
                          </Text>
                          {values.map((v, idx) => (
                            <Text
                              key={`${metric.key}_${idx}`}
                              style={[
                                styles.comparisonValueCell,
                                { color: colorForValue(v, metric, min, max) },
                              ]}
                              numberOfLines={1}
                            >
                              {formatMetricValue(v, metric)}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
              {selectedArray.length > 0 && (
                <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <View style={[styles.cardHeaderRow, { marginBottom: 8 }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Metric bars</Text>
                  </View>

                  <View style={[styles.barCategoryPicker]}>
                    <Text style={[styles.barCategoryPickerTitle, { color: colors.secondaryText }]}>
                      Choose metric groups to display
                    </Text>
                    <View style={styles.barCategoryChips}>
                      {barMetricCategories.map((cat) => {
                        const active = visibleBarCategories.includes(cat.id);
                        return (
                          <Pressable
                            key={cat.id}
                            onPress={() => toggleVisibleBarCategory(cat.id)}
                            style={[
                              styles.barCategoryChip,
                              { borderColor: colors.border, backgroundColor: colors.card },
                              active && { backgroundColor: friendlyAccent(colors.accent, 0.18), borderColor: colors.accent },
                            ]}
                          >
                            <Text style={[styles.barCategoryChipText, { color: active ? colors.accent : colors.text }]}>
                              {cat.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {visibleBarMetricCategories.length === 0 && (
                    <Text style={{ color: colors.secondaryText, marginTop: 4 }}>
                      Select at least one metric group to render charts.
                    </Text>
                  )}

                  {visibleBarMetricCategories.map((cat) => {
                    const selectedKeys = barSelections[cat.id] ?? [];
                    const rawOptions = cat.metrics
                      .map((k) => barMetricOptionsByKey.get(k))
                      .filter(Boolean) as MetricOption[];
                    const options =
                      cat.id === 'performance'
                        ? rawOptions.filter((opt) => isPerformanceKeyForMode(opt.key as MetricKey, performanceMode))
                        : cat.id === 'beta'
                        ? rawOptions.filter((opt) => isBetaKeyForMode(opt.key as MetricKey, betaMode))
                        : cat.id === 'correlation'
                        ? rawOptions.filter((opt) => isCorrelationKeyForMode(opt.key as MetricKey, correlationMode))
                        : rawOptions;
                    const visibleSelectedKeys =
                      cat.id === 'performance'
                        ? selectedKeys.filter((k) => isPerformanceKeyForMode(k, performanceMode))
                        : cat.id === 'beta'
                        ? selectedKeys.filter((k) => isBetaKeyForMode(k, betaMode))
                        : cat.id === 'correlation'
                        ? selectedKeys.filter((k) => isCorrelationKeyForMode(k, correlationMode))
                        : selectedKeys;
                    const selectedOptions = options.filter((opt) => visibleSelectedKeys.includes(opt.key as MetricKey));
                    const series = buildBarSeries(visibleSelectedKeys);
                    const total = options.length;
                    const allSelected = total > 0 && visibleSelectedKeys.length === total;
                    const expanded = barCategoryExpanded[cat.id] ?? false;

                    return (
                      <View key={cat.id} style={[styles.barChartCard, { borderColor: colors.border }]}>
                        <View style={styles.barChartHeader}>
                          <Text style={[styles.cardTitle, { color: colors.text }]}>
                            {cat.label}
                          </Text>
                          <View style={styles.inlineHelpRow}>
                            <Text style={[styles.metricCategoryCount, { color: colors.secondaryText }]}>
                              {visibleSelectedKeys.length}/{total} selected
                            </Text>
                            <Pressable
                              onPress={() => resetBarCategory(cat.id)}
                              style={[styles.bulkBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                            >
                              <Text style={[styles.bulkBtnText, { color: colors.text }]}>Reset</Text>
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.barChartControls}>
                          {cat.id === 'performance' && (
                            <View style={styles.performanceToggleRow}>
                              {(['sharpe', 'sortino'] as PerformanceMode[]).map((mode) => {
                                const active = performanceMode === mode;
                                return (
                                  <Pressable
                                    key={mode}
                                    onPress={() => setPerformanceMode(mode)}
                                    style={[
                                      styles.performanceToggleBtn,
                                      { borderColor: colors.border, backgroundColor: colors.card },
                                      active && { backgroundColor: friendlyAccent(colors.accent, 0.18), borderColor: colors.accent },
                                    ]}
                                  >
                                    <Text style={[styles.performanceToggleText, { color: active ? colors.accent : colors.text }]}>
                                      {mode === 'sharpe' ? 'Sharpe' : 'Sortino'}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          )}
                          {cat.id === 'beta' && (
                            <View style={styles.performanceToggleRow}>
                              {(['world', 'sp500'] as BetaMode[]).map((mode) => {
                                const active = betaMode === mode;
                                return (
                                  <Pressable
                                    key={mode}
                                    onPress={() => setBetaMode(mode)}
                                    style={[
                                      styles.performanceToggleBtn,
                                      { borderColor: colors.border, backgroundColor: colors.card },
                                      active && { backgroundColor: friendlyAccent(colors.accent, 0.18), borderColor: colors.accent },
                                    ]}
                                  >
                                    <Text style={[styles.performanceToggleText, { color: active ? colors.accent : colors.text }]}>
                                      {mode === 'world' ? 'World' : 'S&P 500'}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          )}
                          {cat.id === 'correlation' && (
                            <View style={styles.performanceToggleRow}>
                              {(['world', 'sp500'] as CorrelationMode[]).map((mode) => {
                                const active = correlationMode === mode;
                                return (
                                  <Pressable
                                    key={mode}
                                    onPress={() => setCorrelationMode(mode)}
                                    style={[
                                      styles.performanceToggleBtn,
                                      { borderColor: colors.border, backgroundColor: colors.card },
                                      active && { backgroundColor: friendlyAccent(colors.accent, 0.18), borderColor: colors.accent },
                                    ]}
                                  >
                                    <Text style={[styles.performanceToggleText, { color: active ? colors.accent : colors.text }]}>
                                      {mode === 'world' ? 'World' : 'S&P 500'}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          )}
                          <View style={[styles.metricCategoryChips, { marginBottom: 10 }]}>
                            <Pressable
                              onPress={() => toggleBarCategory(cat.id)}
                              style={[
                                styles.metricCategoryToggle,
                                { borderColor: colors.border, backgroundColor: colors.card },
                                allSelected && { backgroundColor: friendlyAccent(colors.accent, 0.16), borderColor: colors.accent },
                              ]}
                            >
                              <Text style={[styles.metricCategoryToggleText, { color: allSelected ? colors.accent : colors.text }]}>
                                {allSelected ? 'Clear all' : 'Select all'}
                              </Text>
                            </Pressable>
                          </View>
                          <Pressable
                            onPress={() => toggleBarExpansion(cat.id)}
                            style={[
                              styles.selectedChipRow,
                              { borderColor: colors.border, backgroundColor: colors.background },
                              expanded && { borderColor: colors.accent },
                            ]}
                          >
                            <View style={styles.selectedChipStack}>
                              {selectedOptions.length ? (
                                selectedOptions.map((opt) => {
                                  const displayLabel =
                                    cat.id === 'return' ||
                                    cat.id === 'volatility' ||
                                    cat.id === 'performance' ||
                                    cat.id === 'beta' ||
                                    cat.id === 'correlation' ||
                                    cat.id === 'drawdown'
                                      ? getShortLabel(opt)
                                      : opt.label;
                                  return (
                                    <View
                                      key={opt.key}
                                      style={[
                                        styles.barMetricChipCompact,
                                        { borderColor: colors.border, backgroundColor: colors.card },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.barMetricChipCompactText,
                                          { color: colors.text },
                                        ]}
                                      >
                                        {displayLabel}
                                      </Text>
                                    </View>
                                  );
                                })
                              ) : (
                                <Text style={[styles.selectedChipHint, { color: colors.secondaryText }]}>
                                  Tap to pick metrics
                                </Text>
                              )}
                            </View>
                            <View
                              style={[
                                styles.selectedChipAction,
                                { borderColor: colors.border, backgroundColor: '#FFFFFF' },
                                expanded && { borderColor: colors.accent },
                              ]}
                            >
                              <Text style={[styles.selectedChipHint, { color: expanded ? colors.accent : colors.text }]}>
                                {expanded ? 'Close' : 'Edit'}
                              </Text>
                            </View>
                          </Pressable>

                            {expanded && (
                            <View style={styles.metricCategoryChips}>
                              {options.map((opt) => {
                                const active = selectedKeys.includes(opt.key as MetricKey);
                                const displayLabel =
                                  cat.id === 'return' ||
                                  cat.id === 'volatility' ||
                                  cat.id === 'performance' ||
                                  cat.id === 'beta' ||
                                  cat.id === 'correlation' ||
                                  cat.id === 'drawdown'
                                    ? getShortLabel(opt)
                                    : opt.label;
                                return (
                                  <Pressable
                                    key={opt.key}
                                    onPress={() => toggleBarMetric(cat.id, opt.key as MetricKey)}
                                    style={[
                                      styles.metricChip,
                                      styles.barMetricChipExpanded,
                                      { borderColor: colors.border, backgroundColor: colors.card },
                                      active && { backgroundColor: friendlyAccent(colors.accent, 0.2), borderColor: colors.accent },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.metricChipText,
                                        styles.barMetricChipExpandedText,
                                        { color: active ? colors.accent : colors.text },
                                      ]}
                                    >
                                      {displayLabel}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          )}
                        </View>

                        {series.length > 0 ? (
                          <VerticalBarChart
                            series={series.map(({ metric, values, min, max }) => ({
                              label: getShortLabel(metric),
                              values,
                              min,
                              max,
                              format: (v: unknown) => formatMetricValue(v, metric),
                            }))}
                            title={undefined}
                            colors={{
                              text: colors.text,
                              secondaryText: colors.secondaryText,
                              border: colors.border,
                              background: colors.background,
                            }}
                            legend={selectedArray.map((t) => ({
                              label: t.name || t.symbol || String(t.ticker_id),
                              colorIndex: selectedIndexById.get(t.ticker_id) ?? 0,
                              id: t.ticker_id,
                              hidden: hiddenBars.has(t.ticker_id),
                            }))}
                            hiddenIds={hiddenBars}
                            onToggleLegend={toggleBarVisibility}
                          />
                        ) : (
                          <Text style={{ color: colors.secondaryText, marginTop: 8 }}>
                            Select at least one metric in this category to render the chart.
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ),
        })}
        {/* pipeline UI rimossa: spostata in pagina dedicata */}
      </ScrollView>
      <Modal
        transparent
        animationType="fade"
        visible={metricModalVisible}
        onRequestClose={() => setMetricModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMetricModalVisible(false)} />
          <View style={[styles.metricModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.metricModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.metricModalTitle, { color: colors.text }]}>Select metrics</Text>
                <Text style={[styles.metricModalSubtitle, { color: colors.secondaryText }]}>
                  Pick categories and metrics to show under each ETF
                </Text>
              </View>
              <Pressable
                onPress={() => setMetricModalVisible(false)}
                style={[styles.metricModalClose, { borderColor: colors.border }]}
              >
                <Text style={[styles.metricModalCloseText, { color: colors.text }]}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.metricModalScroll} contentContainerStyle={styles.metricModalScrollContent}>
              {metricCategories.map((cat) => {
                const selectedCount = cat.metrics.filter((k) => selectedMetricKeys.includes(k)).length;
                const total = cat.metrics.length;
                const allSelected = total > 0 && selectedCount === total;
                const options = cat.metrics
                  .map((k) => metricOptionByKey.get(k))
                  .filter(Boolean) as MetricOption[];
                return (
                  <View
                    key={cat.id}
                    style={[styles.metricCategoryBlock, { borderColor: colors.border, backgroundColor: colors.background }]}
                  >
                    <View style={styles.metricCategoryHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.metricCategoryTitle, { color: colors.text }]}>{cat.label}</Text>
                        {cat.description ? (
                          <Text style={[styles.metricCategoryDescription, { color: colors.secondaryText }]}>
                            {cat.description}
                          </Text>
                        ) : null}
                        <Text style={[styles.metricCategoryCount, { color: colors.secondaryText }]}>
                          {selectedCount}/{total} selected
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => toggleCategory(cat.id)}
                        style={[styles.metricCategoryToggle, { borderColor: colors.border, backgroundColor: colors.card }]}
                      >
                        <Text style={[styles.metricCategoryToggleText, { color: colors.text }]}>
                          {allSelected ? 'Clear' : 'Add all'}
                        </Text>
                      </Pressable>
                    </View>
                    <View style={styles.metricCategoryChips}>
                      {options.map((opt) => {
                        const active = selectedMetricKeys.includes(opt.key as MetricKey);
                        return (
                          <Pressable
                            key={opt.key}
                            onPress={() => toggleMetric(opt.key as MetricKey)}
                            style={[
                              styles.metricChip,
                              { borderColor: colors.border, backgroundColor: colors.card },
                              active && { backgroundColor: friendlyAccent(colors.accent, 0.2), borderColor: colors.accent },
                            ]}
                          >
                            <Text style={[styles.metricChipText, { color: active ? colors.accent : colors.text }]}>
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.metricModalFooter}>
              <Pressable
                onPress={resetMetrics}
                style={[styles.metricFooterBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.metricFooterBtnText, { color: colors.text }]}>Reset defaults</Text>
              </Pressable>
              <Pressable
                onPress={() => setMetricModalVisible(false)}
                style={[styles.metricFooterBtnPrimary, { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.metricFooterBtnPrimaryText, { color: '#FFFFFF' }]}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    rowGap: 14,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardHeaderRow: {
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
    marginTop: 2,
    fontSize: 13,
  },
  cardContent: {
    marginTop: 12,
  },
  cardContentGap: {
    rowGap: 12,
  },
  cardBadge: {
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
  },
  heroStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tickersHint: {
    fontSize: 13,
  },
  inlineHelpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  metricPicker: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
    marginBottom: 8,
  },
  metricPickerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  metricSummaryRow: {
    rowGap: 4,
    marginBottom: 10,
  },
  metricSummaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricSummaryList: {
    fontSize: 13,
    fontWeight: '500',
  },
  metricChipsRow: {
    columnGap: 8,
    paddingRight: 4,
  },
  metricChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metricChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedChipRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 10,
  },
  selectedChipStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 6,
    flex: 1,
  },
  selectedChipHint: {
    fontSize: 12,
    fontWeight: '700',
  },
  barMetricChipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  barMetricChipCompactText: {
    fontSize: 11,
    fontWeight: '700',
  },
  barMetricChipExpanded: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  barMetricChipExpandedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectedChipAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  performanceToggleRow: {
    flexDirection: 'row',
    columnGap: 8,
    marginBottom: 8,
  },
  performanceToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  performanceToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  barCategoryPicker: {
    rowGap: 8,
    marginBottom: 10,
  },
  barCategoryPickerTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  barCategoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
  },
  barCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  barCategoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricCategoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 10,
    rowGap: 6,
    flexWrap: 'wrap',
    width: '100%',
  },
  metricCategoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 60,
    paddingTop: 5,
  },
  metricChipsCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 6,
    flexShrink: 1,
    flexGrow: 1,
  },
  metricOpenBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    rowGap: 2,
  },
  metricOpenBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  metricOpenBtnSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  resetMetricsBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resetMetricsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  metricModalCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    maxHeight: '92%',
    minHeight: 360,
    width: '94%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: 10,
  },
  metricModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  metricModalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  metricModalSubtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  metricModalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricModalCloseText: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricModalScroll: {
    flex: 1,
    maxHeight: '70%',
  },
  metricModalScrollContent: {
    rowGap: 12,
    paddingBottom: 6,
  },
  metricCategoryBlock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 10,
  },
  metricCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 10,
    marginBottom: 8,
  },
  metricCategoryTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  metricCategoryDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  metricCategoryCount: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  metricCategoryToggle: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricCategoryToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricCategoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricModalFooter: {
    flexDirection: 'row',
    columnGap: 10,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  metricFooterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metricFooterBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  metricFooterBtnPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  metricFooterBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '800',
  },
  returnRow: {
    rowGap: 6,
    marginTop: 2,
  },
  comparisonTableCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 10,
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  comparisonHeaderRow: {
    flexDirection: 'row',
    columnGap: 12,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  comparisonHeaderCell: {
    minWidth: 96,
    fontSize: 12,
    fontWeight: '700',
  },
  comparisonRow: {
    flexDirection: 'row',
    columnGap: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  comparisonMetricCell: {
    minWidth: 120,
    fontSize: 12,
    fontWeight: '600',
  },
  comparisonValueCell: {
    minWidth: 96,
    fontSize: 12,
    fontWeight: '500',
  },
  barChartCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  barChartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barChartControls: {
    rowGap: 6,
  },
  searchRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  searchInput: {
    fontSize: 14,
    fontWeight: '500',
  },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    columnGap: 12,
  },
  bulkBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  bulkBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedCounter: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '600',
  },
  tickerScrollableContainer: {
    overflow: 'hidden',
    width: '100%',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  innerScrollWrapper: {
    flex: 1,
    position: 'relative',
  },
  tickerRow: {
    flexDirection: 'column',
    rowGap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  tickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  tickerDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 6,
  },
  tickerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  tickerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  selectionTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selectionTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  returnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 6,
    marginTop: 2,
  },
  returnBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },
  returnLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  returnValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
    marginVertical: 8,
  },
  paginationSticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pageIndicator: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartStack: {
    rowGap: 16,
  },
  chartToggleRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chartToggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  chartToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

