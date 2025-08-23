import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ETFQueryForm from '@/components/Form/ETFQueryForm';
import ETFLineChart from '@/components/Chart/LineChart';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import AreaChips from '@/components/Filter/AreaChips';

import { apiService } from '@/services/api';
import { ETFData, QueryParams, ChartDataPoint } from '@/types';

type GeographicArea = { area_geografica: string; id_area_geografica: number };
type AreaTicker = { ID_ticker: number; ticker: string };
type DateRange = { start_date: string; end_date: string };
type SelectedMap = Record<number, { ID_ticker: number; ticker: string }>;

type MultiDataset = { label: string; data: number[]; colorHint?: 'up' | 'down' };
// allow optional labels per dataset (shared across series)
type MultiDatasetWithLabels = MultiDataset & { labels?: string[] };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [areas, setAreas] = useState<GeographicArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [tickers, setTickers] = useState<AreaTicker[]>([]);

  const [selectedTickers, setSelectedTickers] = useState<SelectedMap>({});

  // per grafico unico
  const [multiDatasets, setMultiDatasets] = useState<MultiDatasetWithLabels[] | null>(null);

  const [lastRange, setLastRange] = useState<DateRange | null>(null);

  // responsive sizing
  const screenHeight = Dimensions.get('window').height;
  const priceChartHeight = Math.min(260, Math.max(160, Math.round(screenHeight * 0.28)));
  const cumChartHeight = Math.min(200, Math.max(140, Math.round(screenHeight * 0.22)));
  // main list acts as ticker list; no nested virtualization

  useEffect(() => {
    apiService.getGeographicAreas().then(setAreas).catch(() => setAreas([]));
  }, []);

  useEffect(() => {
    if (selectedArea) {
      apiService.getTickersByArea(selectedArea).then(setTickers).catch(() => setTickers([]));
    } else {
      setTickers([]);
    }
  }, [selectedArea]);

  // ===== Aggregazione unificata per grafico unico =====
  const parseYYYYMMDD = (n: number) => {
    const y = Math.floor(n / 10000);
    const m = Math.floor((n % 10000) / 100) - 1;
    const d = n % 100;
    return new Date(y, m, d);
  };
  const fmtYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return Number(`${y}${m}${day}`);
  };
  const daysBetween = (a: Date, b: Date) => Math.max(1, Math.round((+b - +a) / 86400000));

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
      let idx = Math.floor(daysBetween(globalStart, d) / bucketDays);
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
      else next[t.ID_ticker] = { ID_ticker: t.ID_ticker, ticker: t.ticker };
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
        tickers.forEach((t) => (next[t.ID_ticker] = { ID_ticker: t.ID_ticker, ticker: t.ticker }));
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
      const results = await Promise.all(
        toLoad.map((t) =>
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
        return {
          label: t.ticker,
          data: agg.data,
          colorHint: agg.upOrDown,
          labels,
        };
      });

  setMultiDatasets(datasets);
  // fetch cumulative returns in parallel but don't block the price chart
  fetchCumulativeForSelected(range, useCache).catch(() => setCumDatasets(null));
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

  const fetchCumulativeForSelected = async (range: DateRange, useCache: boolean = true) => {
    const toLoad = Object.values(selectedTickers);
    if (toLoad.length === 0) return;
    try {
      const results = await Promise.all(
        toLoad.map((t) => apiService.fetchCumulativeReturns({ id_ticker: t.ID_ticker, start_date: range.start_date, end_date: range.end_date }, useCache).then((r) => ({ t, r })))
      );

      // backend returns arrays per ticker; pick simple cumulative returns
      const datasets: MultiDatasetWithLabels[] = results.map(({ t, r }) => {
        // r.calendar_days expected as numbers YYYYMMDD
        const labels = Array.isArray(r.calendar_days)
          ? r.calendar_days.map((n) => {
              const s = String(n);
              if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
              return s;
            })
          : [];
        return { label: t.ticker, data: r.simple, colorHint: 'up', labels };
      });
      setCumDatasets(datasets);
    } catch (e) {
      setCumDatasets(null);
    }
  };

  const handleSubmit = useCallback(
    (params: QueryParams) => {
      const range: DateRange = { start_date: params.start_date, end_date: params.end_date };
      fetchSelected(range, true);
    },
    [selectedTickers]
  );

  const handleRefresh = useCallback(async () => {
    if (!lastRange || Object.keys(selectedTickers).length === 0) return;
    setRefreshing(true);
    try {
      await fetchSelected(lastRange, false);
    } finally {
      setRefreshing(false);
    }
  }, [lastRange, selectedTickers]);

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
      <View style={styles.chartCard}>
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
        />
        {/* second chart: cumulative simple returns */}
        {cumDatasets && cumDatasets.length > 0 && (
          <ETFLineChart
            multi={cumDatasets.map((ds) => ({ label: ds.label, data: ds.data, colorHint: ds.colorHint, labels: ds.labels }))}
            data={[] as unknown as ChartDataPoint[]}
            ticker="Cumulative Returns"
            height={180}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
        <View style={styles.tickersCard}>
          <View style={styles.tickersHeader}>
            <Text style={styles.tickersTitle}>
              ETF dell’area {selectedArea ? '' : '(nessuna area selezionata)'}
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tickers.length}</Text>
            </View>
          </View>
          {selectedArea == null ? (
            <Text style={styles.tickersHint}>Seleziona un’area per vedere gli ETF.</Text>
          ) : tickers.length === 0 ? (
            <Text style={styles.tickersHint}>Nessun ETF trovato per quest’area.</Text>
          ) : (
            <>
              <View style={styles.bulkRow}>
                <Pressable onPress={toggleSelectAllInArea} style={styles.bulkBtn}>
                  <Text style={styles.bulkBtnText}>
                    {allCurrentSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
                  </Text>
                </Pressable>
                <Text style={styles.selectedCounter}>
                  Selezionati totali: {Object.keys(selectedTickers).length}
                </Text>
              </View>
              <View style={styles.tickerListContainer}>
                {tickers.map((item, idx) => {
                  const isSel = !!selectedTickers[item.ID_ticker];
                  const isLast = idx === tickers.length - 1;
                  return (
                    <View key={item.ID_ticker}>
                      <Pressable onPress={() => toggleSelect(item)} style={styles.tickerRow}>
                        <View style={[styles.checkbox, isSel && styles.checkboxOn]}>
                          <Text style={styles.checkboxMark}>{isSel ? '✓' : ''}</Text>
                        </View>
                        <Text style={styles.tickerSymbol}>{item.ticker}</Text>
                        <Text style={styles.tickerId}>#{item.ID_ticker}</Text>
                      </Pressable>
                      {!isLast && <View style={styles.separator} />}
                    </View>
                  );
                })}
              </View>
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
  tickerId: { fontSize: 12, color: '#6B7280', marginLeft: 8 },
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
  // pipeline styles removed (moved to dedicated screen)
});