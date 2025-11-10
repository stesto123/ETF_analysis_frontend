import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Dimensions, PanResponder, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Target, MapPin } from 'lucide-react-native';

import ETFQueryForm from '@/components/Form/ETFQueryForm';
import ETFLineChart from '@/components/Chart/LineChart';
import { getLineColor } from '@/utils/linePalette';
import { useTheme } from '@/components/common/ThemeProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import AreaChips, { GeographyOption as AreaChipGeographyOption } from '@/components/Filter/AreaChips';

import { apiService } from '@/services/api';
import { PricePoint, QueryParams, ChartDataPoint, GeographyGroup, TickerSummary } from '@/types';
import { useChartSettings } from '@/components/common/ChartSettingsProvider';

type GeographyOption = AreaChipGeographyOption;
type DateRange = { start_date: string; end_date: string };
type SelectedMap = Record<number, TickerSummary>;

type MultiDataset = { label: string; data: number[]; colorHint?: 'up' | 'down'; ticker?: string };
// allow optional labels per dataset (shared across series)
type MultiDatasetWithLabels = MultiDataset & { labels?: string[] };

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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { maxPoints } = useChartSettings();
  const prevMaxPointsRef = useRef(maxPoints);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [geographies, setGeographies] = useState<GeographyGroup[]>([]);
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
  const [tickersLoading, setTickersLoading] = useState(false);
  // Pagination & expandable panel state
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(0);
  const [expandedTickers, setExpandedTickers] = useState(false);
  const screenH = Dimensions.get('window').height;
  const collapsedMaxHeight = Math.round(screenH * 0.5);
  const expandedMaxHeight = Math.round(screenH * 0.88);
  const animatedHeight = React.useRef(new Animated.Value(collapsedMaxHeight)).current;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: expandedTickers ? expandedMaxHeight : collapsedMaxHeight,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [expandedTickers, collapsedMaxHeight, expandedMaxHeight, animatedHeight]);

  // Derived paginated slice
  const pagedTickers = useMemo(() => {
    const start = page * PAGE_SIZE;
    return tickers.slice(start, start + PAGE_SIZE);
  }, [tickers, page]);

  // Clamp page when tickers length changes
  useEffect(() => {
    const maxPage = Math.max(0, Math.floor((tickers.length - 1) / PAGE_SIZE));
    if (page > maxPage) setPage(0);
  }, [tickers.length, page]);

  useEffect(() => { setPage(0); }, [selectedArea]);

  const canPrev = page > 0;
  const maxPage = Math.max(0, Math.floor((tickers.length - 1) / PAGE_SIZE));
  const canNext = page < maxPage;

  // Gesture (drag handle) to expand / collapse
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -40 && !expandedTickers) setExpandedTickers(true);
        else if (gesture.dy > 40 && expandedTickers) setExpandedTickers(false);
      },
    })
  ).current;

  const [selectedTickers, setSelectedTickers] = useState<SelectedMap>({});

  // per grafico unico
  const [multiDatasets, setMultiDatasets] = useState<MultiDatasetWithLabels[] | null>(null);

  const [lastRange, setLastRange] = useState<DateRange | null>(null);

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
  const contentTopPadding = Math.max(24, insets.top + 8);
  const selectionStatLabel = totalTickers > 0 ? `${selectedCount}/${totalTickers} selected` : `${selectedCount} selected`;
  const areaStatLabel = totalAreas > 0 ? `${totalAreas} areas · ${lastRangeLabel}` : lastRangeLabel;
  const heroSubtitle = useMemo(() => {
    if (totalTickers === 0) return 'No ETFs available for this area. Try a different selection.';
    if (selectedCount > 0) return `You are tracking ${selectedCount} ETFs from ${currentAreaName}.`;
    return `Select ETFs to analyze the performance of ${currentAreaName}.`;
  }, [selectedCount, currentAreaName, totalTickers]);

  // responsive sizing (kept for possible future use)
  // const screenHeight = Dimensions.get('window').height;
  // const priceChartHeight = Math.min(260, Math.max(160, Math.round(screenHeight * 0.28)));
  // const cumChartHeight = Math.min(200, Math.max(140, Math.round(screenHeight * 0.22)));
  // main list acts as ticker list; no nested virtualization

  useEffect(() => {
    let cancelled = false;
    setTickersLoading(true);
    apiService
      .getGeographies(true)
      .then((items) => {
        if (!cancelled) setGeographies(items);
      })
      .catch(() => {
        if (!cancelled) setGeographies([]);
      })
      .finally(() => {
        if (!cancelled) setTickersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (tickers.length === 0) return false;
    return tickers.every((t) => !!selectedTickers[t.ticker_id]);
  }, [tickers, selectedTickers]);

  const toggleSelectAllInArea = () => {
    setSelectedTickers((prev) => {
      const next: SelectedMap = { ...prev };
      if (allCurrentSelected) {
        tickers.forEach((t) => delete next[t.ticker_id]);
      } else {
        tickers.forEach((t) => {
          next[t.ticker_id] = t;
        });
      }
      return next;
    });
  };

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

    return (
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ETFLineChart
          // nuovo modo: un unico grafico con più serie
          multi={multiDatasets.map((ds) => ({
            label: ds.label,
            data: ds.data,
            colorHint: ds.colorHint,
            labels: ds.labels,
          }))}
          // fallback props legacy non usate
          data={[] as unknown as ChartDataPoint[]}
          ticker="Selected ETFs"
          height={220}
          yAxisFormat="currency"
          currencySymbol="$"
        />
        {/* second chart: cumulative simple returns */}
        {cumDatasets && cumDatasets.length > 0 && (
          <ETFLineChart
            multi={cumDatasets.map((ds) => ({ label: ds.label, data: ds.data, colorHint: ds.colorHint, labels: ds.labels }))}
            data={[] as unknown as ChartDataPoint[]}
            ticker="Cumulative Returns"
            height={180}
            yAxisFormat="percent"
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
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

        <AreaChips areas={geographyOptions} selectedId={selectedArea} onSelect={setSelectedArea} loading={tickersLoading} />
  <View style={[styles.tickersCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.tickersHeader}>
            <Text style={[styles.tickersTitle, { color: colors.text }] }>
              {selectedArea == null ? 'ETFs from all areas' : 'ETFs from the selected area'}
            </Text>
            <View style={[styles.badge, { backgroundColor: colors.background }]}> 
              <Text style={[styles.badgeText, { color: colors.text }]}>{tickers.length}</Text>
            </View>
          </View>
          {tickersLoading ? (
            <Text style={[styles.tickersHint, { color: colors.secondaryText }]}>Loading ETFs…</Text>
          ) : tickers.length === 0 ? (
            <Text style={[styles.tickersHint, { color: colors.secondaryText }]}>
              {selectedArea == null ? 'No active tickers assigned to geographies.' : 'No active tickers for this area.'}
            </Text>
          ) : (
            <>
              <View style={styles.bulkRow}>
                <Pressable onPress={toggleSelectAllInArea} style={[styles.bulkBtn, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Text style={[styles.bulkBtnText, { color: colors.text }]}>
                    {allCurrentSelected ? 'Deselect all' : 'Select all'}
                  </Text>
                </Pressable>
                <Text style={[styles.selectedCounter, { color: colors.secondaryText }]}>
                  Selected: {selectedCount}
                </Text>
              </View>
              <Animated.View style={[styles.tickerScrollableContainer, { height: animatedHeight }]}> 
                <View style={styles.dragHandleWrapper} {...panResponder.panHandlers}>
                  <Pressable onPress={() => setExpandedTickers(e => !e)} style={styles.dragHandlePress} hitSlop={8}>
                    <View style={[styles.dragHandleBar, { backgroundColor: colors.border }]} />
                    <Text style={[styles.handleLabel, { color: colors.secondaryText }]}>
                      {expandedTickers ? 'Collapse list' : 'Expand list'}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.innerScrollWrapper}> 
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                    contentContainerStyle={{ paddingBottom: 8 }}
                  >
                    {pagedTickers.map((item, index) => {
                      const isSel = !!selectedTickers[item.ticker_id];
                      const selIdx = selectedIndexById.get(item.ticker_id);
                      const dotColor = isSel && selIdx !== undefined ? getLineColor(selIdx) : '#D1D5DB';
                      return (
                        <View key={item.ticker_id}>
                          <Pressable onPress={() => toggleSelect(item)} style={styles.tickerRow}>
                            <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: colors.card }, isSel && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                              <Text style={styles.checkboxMark}>{isSel ? '✓' : ''}</Text>
                            </View>
                            {/* colored dot matches chart/legend color for selected items; grey when not selected */}
                            <View style={[styles.tickerDot, { backgroundColor: dotColor }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.tickerName, { color: colors.text }]} numberOfLines={1}>{item.name || item.symbol}</Text>
                              <Text style={[styles.tickerSubtitle, { color: colors.secondaryText }]} numberOfLines={1}>
                                {item.symbol}
                                {item.asset_class ? ` • ${item.asset_class}` : ''}
                              </Text>
                            </View>
                            {/* removed numeric ID label */}
                          </Pressable>
                          {index < pagedTickers.length - 1 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                        </View>
                      );
                    })}
                    <View style={{ height: 4 }} />
                  </ScrollView>
                  {/* Gradient / fade when collapsed & not last page */}
                  {!expandedTickers && canNext && (
                    <View pointerEvents="none" style={[styles.fadeBottom, { backgroundColor: colors.card }]} />
                  )}
                </View>
              </Animated.View>
              {/* Pagination controls */}
              {tickers.length > PAGE_SIZE && (
                <View style={styles.paginationRow}>
                  <Pressable disabled={!canPrev} onPress={() => canPrev && setPage(p => p - 1)} style={[styles.pageBtn, !canPrev && styles.pageBtnDisabled]}>
                    <Text style={styles.pageBtnText}>{'<'}</Text>
                  </Pressable>
                  <Text style={[styles.pageIndicator, { color: colors.text }]}>Page {page + 1} / {maxPage + 1}</Text>
                  <Pressable disabled={!canNext} onPress={() => canNext && setPage(p => p + 1)} style={[styles.pageBtn, !canNext && styles.pageBtnDisabled]}>
                    <Text style={styles.pageBtnText}>{'>'}</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
        <ETFQueryForm onSubmit={handleSubmit} loading={loading} />
        <View style={[styles.chartContainer, { paddingBottom: Math.max(12, insets.bottom) }]}>
          {renderChart()}
        </View>
  {/* pipeline UI rimossa: spostata in pagina dedicata */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    rowGap: 20,
  },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 14,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tickersCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  tickersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    columnGap: 12,
  },
  tickersTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  tickersHint: {
    fontSize: 13,
  },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  },
  dragHandleWrapper: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 6,
  },
  dragHandlePress: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dragHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 6,
    opacity: 0.75,
  },
  handleLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  innerScrollWrapper: {
    flex: 1,
    position: 'relative',
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 14,
    paddingVertical: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  tickerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 2,
  },
  tickerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  tickerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
    marginVertical: 8,
  },
  fadeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 12,
    marginTop: 12,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
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
  chartContainer: {
    flex: 1,
    marginTop: 8,
  },
  chartCard: {
    borderRadius: 18,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    rowGap: 16,
  },
});
