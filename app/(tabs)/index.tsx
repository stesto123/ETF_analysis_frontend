import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, Pressable } from 'react-native';
import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ETFQueryForm from '@/components/Form/ETFQueryForm';
import ETFLineChart from '@/components/Chart/LineChart';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import AreaChips from '@/components/Filter/AreaChips';

import { apiService } from '@/services/api';
import { ChartDataPoint, QueryParams } from '@/types';
import useETFData from '@/hooks/useETFData';

type GeographicArea = { area_geografica: string; id_area_geografica: number };
type AreaTicker = { ID_ticker: number; ticker: string };
type DateRange = { start_date: string; end_date: string };
type SelectedMap = Record<number, { ID_ticker: number; ticker: string }>;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const [areas, setAreas] = useState<GeographicArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [tickers, setTickers] = useState<AreaTicker[]>([]);

  const [selectedTickers, setSelectedTickers] = useState<SelectedMap>({});

  // per grafico unico
  const { loading, error, multiDatasets, cumDatasets, lastRange, fetchSelected } = useETFData();

  // loading / error are provided by the useETFData hook

  // responsive sizing
  const screenHeight = Dimensions.get('window').height;
  const priceChartHeight = Math.min(260, Math.max(160, Math.round(screenHeight * 0.28)));
  const cumChartHeight = Math.min(200, Math.max(140, Math.round(screenHeight * 0.22)));
  const tickerListMaxHeight = Math.min(240, Math.max(120, Math.round(screenHeight * 0.25)));

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

  // aggregation + labeling logic is provided by `useETFData` and `utils/aggregation`

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
  // dataset fetching is handled by the hook: call it with the selected tickers list

  // cumulative datasets are provided by the hook (cumDatasets)

  const handleSubmit = useCallback(
    (params: QueryParams) => {
      const range: DateRange = { start_date: params.start_date, end_date: params.end_date };
  // pass the currently selected tickers to the hook
  fetchSelected(Object.values(selectedTickers), range, true);
    },
    [selectedTickers]
  );

  const handleRefresh = useCallback(async () => {
    if (!lastRange || Object.keys(selectedTickers).length === 0) return;
    setRefreshing(true);
    try {
      await fetchSelected(Object.values(selectedTickers), lastRange, false);
    } finally {
      setRefreshing(false);
    }
  }, [lastRange, selectedTickers]);

  const handleRetry = () => {
  if (lastRange) fetchSelected(Object.values(selectedTickers), lastRange, false);
  };

  // ===== RENDER HELPERS =====
  const renderTickersList = () => (
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

          <View style={{ maxHeight: tickerListMaxHeight }}>
            <FlatList
              data={tickers}
              keyExtractor={(item) => String(item.ID_ticker)}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const isSel = !!selectedTickers[item.ID_ticker];
                return (
                  <Pressable onPress={() => toggleSelect(item)} style={styles.tickerRow}>
                    <View style={[styles.checkbox, isSel && styles.checkboxOn]}>
                      <Text style={styles.checkboxMark}>{isSel ? '✓' : ''}</Text>
                    </View>
                    <Text style={styles.tickerSymbol}>{item.ticker}</Text>
                    <Text style={styles.tickerId}>#{item.ID_ticker}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </>
      )}
    </View>
  );

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
      <FlatList
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 12) }}
        data={[]}
        renderItem={() => null}
        // header contains the main UI controls and tickers list
        ListHeaderComponent={() => (
          <>
            <AreaChips areas={areas} selectedId={selectedArea} onSelect={setSelectedArea} loading={loading} />

            {renderTickersList()}

            <ETFQueryForm onSubmit={handleSubmit} loading={loading} />
          </>
        )}
        // footer contains the charts
        ListFooterComponent={() => (
          <View style={[styles.chartContainer, { paddingBottom: Math.max(12, insets.bottom) }]}>
            {renderChart()}
          </View>
        )}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        keyExtractor={() => 'empty'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollView: { flex: 1 },

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
});