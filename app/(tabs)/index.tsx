import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Dimensions, PanResponder, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ETFQueryForm from '@/components/Form/ETFQueryForm';
import ETFLineChart from '@/components/Chart/LineChart';
import { getLineColor } from '@/utils/linePalette';
import { useTheme } from '@/components/common/ThemeProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import AreaChips from '@/components/Filter/AreaChips';

import { apiService } from '@/services/api';
import { ETFData, QueryParams, ChartDataPoint } from '@/types';

type GeographicArea = { area_geografica: string; id_area_geografica: number };
type AreaTicker = { ID_ticker: number; ticker: string; nome: string };
type DateRange = { start_date: string; end_date: string };
type SelectedMap = Record<number, { ID_ticker: number; ticker: string; nome: string }>;

type MultiDataset = { label: string; data: number[]; colorHint?: 'up' | 'down'; ticker?: string };
// allow optional labels per dataset (shared across series)
type MultiDatasetWithLabels = MultiDataset & { labels?: string[] };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [areas, setAreas] = useState<GeographicArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [tickers, setTickers] = useState<AreaTicker[]>([]);
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
  }, [expandedTickers, collapsedMaxHeight, expandedMaxHeight]);

  // Derived paginated slice
  const pagedTickers = useMemo(() => {
    const start = page * PAGE_SIZE;
    return tickers.slice(start, start + PAGE_SIZE);
  }, [tickers, page]);

  // Clamp page when tickers length changes
  useEffect(() => {
    const maxPage = Math.max(0, Math.floor((tickers.length - 1) / PAGE_SIZE));
    if (page > maxPage) setPage(0);
  }, [tickers.length]);

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
      const an = (a as any).nome || a.ticker || '';
      const bn = (b as any).nome || b.ticker || '';
      return String(an).localeCompare(String(bn));
    });
  }, [selectedTickers]);
  // Map from ID_ticker to palette index to mirror chart series order/colors
  const selectedIndexById = useMemo(() => {
    const m = new Map<number, number>();
    selectedArray.forEach((t, i) => m.set(t.ID_ticker, i));
    return m;
  }, [selectedArray]);

  // responsive sizing
  const screenHeight = Dimensions.get('window').height;
  // responsive sizing (kept for possible future use)
  // const priceChartHeight = Math.min(260, Math.max(160, Math.round(screenHeight * 0.28)));
  // const cumChartHeight = Math.min(200, Math.max(140, Math.round(screenHeight * 0.22)));
  // main list acts as ticker list; no nested virtualization

  useEffect(() => {
    apiService.getGeographicAreas().then(setAreas).catch(() => setAreas([]));
  }, []);

    // Caricamento tickers per area o tutte le aree
    useEffect(() => {
      let cancelled = false;
      const load = async () => {
        if (areas.length === 0) { setTickers([]); return; }
        setTickersLoading(true);
        try {
          if (selectedArea == null) {
            // Aggrega tutti i tickers di tutte le aree
            const lists = await Promise.all(
              areas.map(a => apiService.getTickersByArea(a.id_area_geografica, true).catch(() => []))
            );
            const map: Record<number, AreaTicker> = {};
            lists.forEach(lst => {
              lst.forEach(t => { map[t.ID_ticker] = t; });
            });
            const merged = Object.values(map).sort((a,b) => a.ticker.localeCompare(b.ticker));
            if (!cancelled) setTickers(merged);
          } else {
            const list = await apiService.getTickersByArea(selectedArea, true).catch(() => []);
            if (!cancelled) setTickers(list);
          }
        } finally {
          if (!cancelled) setTickersLoading(false);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [selectedArea, areas]);

  // ===== Aggregazione unificata per grafico unico =====
  const parseYYYYMMDD = (n: number) => {
    const y = Math.floor(n / 10000);
    const m = Math.floor((n % 10000) / 100) - 1;
    const d = n % 100;
    return new Date(y, m, d);
  };
  // kept helper removed to silence unused var lint; recreate if needed
  const daysBetween = (a: Date, b: Date) => Math.max(1, Math.round((+b - +a) / 86400000));
  // precise non-negative floor days difference for bucket indexing (0 when same day)
  const diffDays = (a: Date, b: Date) => Math.max(0, Math.floor((+b - +a) / 86400000));

  // Decidi la granularità comune (in giorni) in base allo span globale
  const chooseBucketDays = (spanDays: number, maxPoints = 60) => {
    let bucketDays: number;
    if (spanDays <= 60) bucketDays = 1;
    else if (spanDays <= 180) bucketDays = 7;
    else if (spanDays <= 720) bucketDays = 30;
    else bucketDays = 90;
    const est = Math.ceil(spanDays / bucketDays);
    return est > maxPoints ? Math.ceil(spanDays / maxPoints) : bucketDays;
  };

  // Aggrega una serie cumulativa (calendar_days + values) sui bucket comuni
  const aggregateCumulativeOnBuckets = (
    calendar_days: number[],
    values: number[],
    globalStart: Date,
    bucketDays: number,
    bucketCount: number
  ): number[] => {
    // Track the latest day seen per bucket to make this independent from input order
    const buckets: Array<{ day: number; value: number } | undefined> = new Array(bucketCount).fill(undefined);
    const n = Math.min(calendar_days.length, values.length);
    // zip and sort by day ascending to normalize order
    const pts: Array<{ day: number; value: number }> = [];
    for (let i = 0; i < n; i++) {
      const day = Number(calendar_days[i]);
      const value = Number(values[i]);
      if (!Number.isFinite(day) || !Number.isFinite(value)) continue;
      pts.push({ day, value });
    }
    pts.sort((a, b) => a.day - b.day);
    for (const p of pts) {
      const d = parseYYYYMMDD(p.day);
      let idx = Math.floor(diffDays(globalStart, d) / bucketDays);
      if (idx < 0) idx = 0;
      if (idx >= bucketCount) idx = bucketCount - 1;
      // keep the latest calendar day value per bucket
      const cur = buckets[idx];
      if (!cur || p.day > cur.day) {
        buckets[idx] = { day: p.day, value: p.value };
      }
    }
    // forward-fill
    const series: number[] = [];
    let prev = 0;
    // initialize prev with first defined if exists
    for (let i = 0; i < bucketCount; i++) {
      const cell = buckets[i];
      if (cell && !Number.isNaN(cell.value)) { prev = cell.value; break; }
    }
    for (let i = 0; i < bucketCount; i++) {
      const cell = buckets[i];
      if (cell && !Number.isNaN(cell.value)) prev = cell.value;
      series.push(prev);
    }
    return series;
  };

  // Aggrega una serie (ETF rows) sui bucket comuni
  const aggregateOnBuckets = (
    rows: ETFData[],
    globalStart: Date,
    bucketDays: number,
    bucketCount: number
  ): { data: number[]; upOrDown: 'up' | 'down' } => {
    const sorted = [...rows].sort((a, b) => a.calendar_id - b.calendar_id);
    const acc = Array.from({ length: bucketCount }, () => ({ sum: 0, cnt: 0 }));

    for (const r of sorted) {
      const d = parseYYYYMMDD(r.calendar_id);
  let idx = Math.floor(diffDays(globalStart, d) / bucketDays);
      if (idx < 0) idx = 0;
      if (idx >= bucketCount) idx = bucketCount - 1;
      const price = parseFloat(r.close_price);
      const cell = acc[idx];
      cell.sum += price;
      cell.cnt += 1;
    }

    const series: number[] = [];
    let prev = sorted.length ? parseFloat(sorted[0].close_price) : 0;
    for (let i = 0; i < bucketCount; i++) {
      const cell = acc[i];
      if (cell.cnt > 0) {
        prev = cell.sum / cell.cnt;
        series.push(prev);
      } else {
        // forward-fill per mantenere continuità visiva
        series.push(prev);
      }
    }

    const first = series[0] ?? 0;
    const last = series[series.length - 1] ?? first;
    const upOrDown: 'up' | 'down' = last >= first ? 'up' : 'down';
    return { data: series, upOrDown };
  };

  // ===== Selezione ETF (toggle) =====
  const toggleSelect = (t: AreaTicker) => {
    setSelectedTickers((prev) => {
      const next = { ...prev };
      if (next[t.ID_ticker]) delete next[t.ID_ticker];
      else next[t.ID_ticker] = { ID_ticker: t.ID_ticker, ticker: t.ticker, nome: t.nome };
      return next;
    });
  };

  const allCurrentSelected = useMemo(() => {
    if (tickers.length === 0) return false;
    return tickers.every((t) => !!selectedTickers[t.ID_ticker]);
  }, [tickers, selectedTickers]);

  const toggleSelectAllInArea = () => {
    setSelectedTickers((prev) => {
      const next: SelectedMap = { ...prev };
      if (allCurrentSelected) {
        tickers.forEach((t) => delete next[t.ID_ticker]);
      } else {
        tickers.forEach((t) => (next[t.ID_ticker] = { ID_ticker: t.ID_ticker, ticker: t.ticker, nome: t.nome }));
      }
      return next;
    });
  };

  // ===== Fetch selezionati -> build datasets unificati =====
  const fetchSelected = async (range: DateRange, useCache: boolean = true) => {
    const toLoad = Object.values(selectedTickers);
    if (toLoad.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // deterministic order for color consistency in charts/legend
      const toLoadOrdered = Object.values(selectedTickers).sort((a, b) => {
        const an = (a as any).nome || a.ticker || '';
        const bn = (b as any).nome || b.ticker || '';
        return String(an).localeCompare(String(bn));
      });

      const results = await Promise.all(
        toLoadOrdered.map((t) =>
          apiService
            .fetchETFData(
              { id_ticker: t.ID_ticker, start_date: range.start_date, end_date: range.end_date } as QueryParams,
              useCache
            )
            .then((rows) => ({ t, rows }))
        )
      );

      // Globale start/end
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
      const bucketDays = chooseBucketDays(spanDays, 60);
      const bucketCount = Math.max(1, Math.ceil(spanDays / bucketDays) + 1);

      // build shared labels from buckets (YYYY-MM-DD)
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

      const datasets: MultiDatasetWithLabels[] = results.map(({ t, rows }) => {
        const agg = aggregateOnBuckets(rows, globalStart, bucketDays, bucketCount);
        // try to extract a display name from rows (backend may include nome in /api/dati)
        const rowNome = rows.find(r => typeof (r as any).nome === 'string') as any;
        const displayName = (rowNome && rowNome.nome) || t.nome || t.ticker;
        return { label: displayName, ticker: t.ticker, data: agg.data, colorHint: agg.upOrDown, labels };
      });

      setMultiDatasets(datasets);
      // fetch cumulative returns using the SAME bucketing/labels for consistency
      fetchCumulativeForSelected(range, useCache, { globalStart, bucketDays, bucketCount, labels })
        .catch(() => setCumDatasets(null));
      setLastRange(range);
    } catch (e) {
      setMultiDatasets(null);
      setError(e instanceof Error ? e.message : 'Errore inatteso durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  // ------- cumulative returns (second chart) -------
  const [cumDatasets, setCumDatasets] = useState<MultiDatasetWithLabels[] | null>(null);

  const fetchCumulativeForSelected = async (
    range: DateRange,
    useCache: boolean = true,
    bucketing?: { globalStart: Date; bucketDays: number; bucketCount: number; labels: string[] }
  ) => {
    const toLoad = Object.values(selectedTickers).sort((a, b) => {
      const an = (a as any).nome || a.ticker || '';
      const bn = (b as any).nome || b.ticker || '';
      return String(an).localeCompare(String(bn));
    });
    if (toLoad.length === 0) return;
    try {
      const results = await Promise.all(
        toLoad.map((t) => apiService.fetchCumulativeReturns({ id_ticker: t.ID_ticker, start_date: range.start_date, end_date: range.end_date }, useCache).then((r) => ({ t, r })))
      );

      let labels: string[] = [];
      let globalStart: Date | null = null;
      let bucketDays = 1;
      let bucketCount = 0;

      if (bucketing) {
        labels = bucketing.labels;
        globalStart = bucketing.globalStart;
        bucketDays = bucketing.bucketDays;
        bucketCount = bucketing.bucketCount;
      } else {
        // fallback: derive common bucketing from cum series span
        let minCal = Infinity;
        let maxCal = -Infinity;
        results.forEach(({ r }) => {
          if (!Array.isArray(r.calendar_days) || r.calendar_days.length === 0) return;
          const first = r.calendar_days[0];
          const last = r.calendar_days[r.calendar_days.length - 1];
          minCal = Math.min(minCal, first);
          maxCal = Math.max(maxCal, last);
        });
        if (!isFinite(minCal) || !isFinite(maxCal)) {
          setCumDatasets(null);
          return;
        }
        globalStart = parseYYYYMMDD(minCal);
        const globalEnd = parseYYYYMMDD(maxCal);
        const spanDays = daysBetween(globalStart, globalEnd);
        bucketDays = chooseBucketDays(spanDays, 60);
        bucketCount = Math.max(1, Math.ceil(spanDays / bucketDays) + 1);
        const buildLabel = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };
        labels = [];
        for (let i = 0; i < bucketCount; i++) {
          const dt = new Date(globalStart.getTime() + i * bucketDays * 86400000);
          labels.push(buildLabel(dt));
        }
      }

      // downsample cumulative returns to match buckets
      const datasets: MultiDatasetWithLabels[] = results.map(({ t, r }) => {
        const rawSeries = aggregateCumulativeOnBuckets(
          Array.isArray(r.calendar_days) ? r.calendar_days : [],
          Array.isArray(r.simple) ? r.simple : [],
          globalStart!,
          bucketDays,
          bucketCount
        );
        // Convert from decimal returns (e.g., 0.1) to percentage values (10) for display
        const series = rawSeries.map(v => (Number.isFinite(v) ? v * 100 : v));
        const first = series[0] ?? 0;
        const last = series[series.length - 1] ?? first;
        const upOrDown: 'up' | 'down' = last >= first ? 'up' : 'down';
        const label = (r.name || t.nome || t.ticker) + ' (%)';
        return { label, ticker: t.ticker, data: series, colorHint: upOrDown, labels };
      });
      setCumDatasets(datasets);
    } catch {
      setCumDatasets(null);
    }
  };

  const handleSubmit = useCallback(
    (params: QueryParams) => {
      const range: DateRange = { start_date: params.start_date, end_date: params.end_date };
      fetchSelected(range, true);
    },
  [selectedTickers, fetchSelected]
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

  

  // ===== RENDER HELPERS =====
  // main FlatList renders tickers; header & footer handle rest

  const renderChart = () => {
    if (loading && !refreshing) return <LoadingSpinner message="Fetching ETF data..." />;
    if (error) return <ErrorDisplay error={error} onRetry={handleRetry} />;

    if (!multiDatasets || multiDatasets.length === 0) {
      return (
        <EmptyState
          title="Nessun dato"
          message={
            Object.keys(selectedTickers).length === 0
              ? 'Seleziona uno o più ETF dalla lista e imposta le date.'
              : 'Premi Fetch per caricare il grafico degli ETF selezionati.'
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingBottom: Math.max(12, insets.bottom + 12) }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 12) }}
      >
        <AreaChips
          areas={areas}
          selectedId={selectedArea}
          onSelect={setSelectedArea}
          loading={loading}
        />
  <View style={[styles.tickersCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.tickersHeader}>
            <Text style={[styles.tickersTitle, { color: colors.text }] }>
              {selectedArea == null ? 'ETF di tutte le aree' : 'ETF dell’area selezionata'}
            </Text>
            <View style={[styles.badge, { backgroundColor: colors.background }]}> 
              <Text style={[styles.badgeText, { color: colors.text }]}>{tickers.length}</Text>
            </View>
          </View>
          {tickersLoading ? (
            <Text style={[styles.tickersHint, { color: colors.secondaryText }]}>Caricamento ETF…</Text>
          ) : tickers.length === 0 ? (
            <Text style={[styles.tickersHint, { color: colors.secondaryText }]}>
              {selectedArea == null ? 'Nessun ETF trovato (lista vuota).' : 'Nessun ETF trovato per quest’area.'}
            </Text>
          ) : (
            <>
              <View style={styles.bulkRow}>
                <Pressable onPress={toggleSelectAllInArea} style={[styles.bulkBtn, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Text style={[styles.bulkBtnText, { color: colors.text }]}>
                    {allCurrentSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
                  </Text>
                </Pressable>
                <Text style={[styles.selectedCounter, { color: colors.secondaryText }]}>
                  Selezionati: {Object.keys(selectedTickers).length}
                </Text>
              </View>
              <Animated.View style={[styles.tickerScrollableContainer, { height: animatedHeight }]}> 
                <View style={styles.dragHandleWrapper} {...panResponder.panHandlers}>
                  <Pressable onPress={() => setExpandedTickers(e => !e)} style={styles.dragHandlePress} hitSlop={8}>
                    <View style={[styles.dragHandleBar, { backgroundColor: colors.border }]} />
                    <Text style={[styles.handleLabel, { color: colors.secondaryText }]}>
                      {expandedTickers ? 'Riduci elenco' : 'Espandi elenco'}
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
                      const isSel = !!selectedTickers[item.ID_ticker];
                      const selIdx = selectedIndexById.get(item.ID_ticker);
                      const dotColor = isSel && selIdx !== undefined ? getLineColor(selIdx) : '#D1D5DB';
                      return (
                        <View key={item.ID_ticker}>
                          <Pressable onPress={() => toggleSelect(item)} style={styles.tickerRow}>
                            <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: colors.card }, isSel && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                              <Text style={styles.checkboxMark}>{isSel ? '✓' : ''}</Text>
                            </View>
                            {/* colored dot matches chart/legend color for selected items; grey when not selected */}
                            <View style={[styles.tickerDot, { backgroundColor: dotColor }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.tickerName, { color: colors.text }]} numberOfLines={1}>{item.nome || item.ticker}</Text>
                              <Text style={[styles.tickerSubtitle, { color: colors.secondaryText }]} numberOfLines={1}>{item.ticker}</Text>
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
                  <Text style={[styles.pageIndicator, { color: colors.text }]}>Pagina {page + 1} / {maxPage + 1}</Text>
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollView: { flex: 1 }, // deprecated after refactor, kept if reused elsewhere
  firstTickerWrapper: { backgroundColor: '#FFFFFF', marginHorizontal: 12, borderRadius: 10 }, // legacy
  tickerListContainer: { marginTop: 4 },

  tickersCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 10,
  padding: 12,
  marginHorizontal: 12,
  marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tickersHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tickersTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  tickersHint: { color: '#6B7280', fontSize: 13 },
  separator: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  tickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  tickerSymbol: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  tickerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  tickerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  tickerId: { fontSize: 12, color: '#6B7280', marginLeft: 8 },
  tickerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4, opacity: 0.9 },
  badge: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 12, color: '#111827', fontWeight: '700' },
  bulkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 12 },
  bulkBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  bulkBtnText: { fontSize: 12, color: '#111827', fontWeight: '600' },
  selectedCounter: { marginLeft: 'auto', fontSize: 12, color: '#374151', fontWeight: '600' },

  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  checkboxOn: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  checkboxMark: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  chartContainer: { flex: 1, minHeight: 300, paddingBottom: 16 },
  chartCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 10,
  padding: 6,
  marginHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  // New ticker list pagination / expansion styles
  dragHandleWrapper: { alignItems: 'center', paddingTop: 4, paddingBottom: 4 },
  dragHandlePress: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  dragHandleBar: { width: 44, height: 5, borderRadius: 3, marginBottom: 4, opacity: 0.7 },
  handleLabel: { fontSize: 11, fontWeight: '500' },
  flatList: { flexGrow: 0 },
  flatListContent: { paddingBottom: 8 },
  fadeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    backgroundColor: 'transparent',
    // gradient simulation via layered opacity (could replace with expo-linear-gradient)
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8 },
  pageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#E5E7EB' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  pageIndicator: { fontSize: 12, fontWeight: '600' },
  tickerScrollableContainer: { overflow: 'hidden', width: '100%' },
  innerScrollWrapper: { flex: 1, position: 'relative' },
  // pipeline styles removed (moved to dedicated screen)
});