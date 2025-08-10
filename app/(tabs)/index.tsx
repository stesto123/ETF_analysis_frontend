import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  FlatList,
  Pressable,
} from 'react-native';

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

// Oggetto minimale per i selezionati (persistono anche cambiando area)
type SelectedMap = Record<number, { ID_ticker: number; ticker: string }>;

export default function HomeScreen() {
  // stato UI
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // aree e ticker dell’area corrente
  const [areas, setAreas] = useState<GeographicArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [tickers, setTickers] = useState<AreaTicker[]>([]);

  // selezionati cross-area
  const [selectedTickers, setSelectedTickers] = useState<SelectedMap>({});

  // serie pronte per i grafici dei selezionati
  const [seriesByTicker, setSeriesByTicker] = useState<Record<string, ChartDataPoint[]>>({});

  // ultimo range date
  const [lastRange, setLastRange] = useState<DateRange | null>(null);

  // carica aree all’avvio
  useEffect(() => {
    apiService.getGeographicAreas().then(setAreas).catch(() => setAreas([]));
  }, []);

  // quando cambia area, carica lista ETF (non toccare i selezionati!)
  useEffect(() => {
    if (selectedArea) {
      apiService
        .getTickersByArea(selectedArea)
        .then(setTickers)
        .catch(() => setTickers([]));
    } else {
      setTickers([]);
    }
  }, [selectedArea]);

  // helper: ETFData -> ChartDataPoint[]
  const toChartSeries = (rows: ETFData[]): ChartDataPoint[] =>
    rows
      .sort((a, b) => a.calendar_id - b.calendar_id)
      .map((item) => ({
        date: item.calendar_id.toString(),
        price: parseFloat(item.close_price),
        volume: item.volume,
      }));

  // toggle selezione singolo ETF
  const toggleSelect = (t: AreaTicker) => {
    setSelectedTickers((prev) => {
      const next = { ...prev };
      if (next[t.ID_ticker]) {
        delete next[t.ID_ticker];
      } else {
        next[t.ID_ticker] = { ID_ticker: t.ID_ticker, ticker: t.ticker };
      }
      return next;
    });
  };

  // utility: seleziona/deseleziona tutti i ticker della lista corrente
  const allCurrentSelected = useMemo(() => {
    if (tickers.length === 0) return false;
    return tickers.every((t) => !!selectedTickers[t.ID_ticker]);
  }, [tickers, selectedTickers]);

  const toggleSelectAllInArea = () => {
    setSelectedTickers((prev) => {
      const next: SelectedMap = { ...prev };
      if (allCurrentSelected) {
        // rimuovi tutti quelli dell’area corrente
        tickers.forEach((t) => {
          if (next[t.ID_ticker]) delete next[t.ID_ticker];
        });
      } else {
        // aggiungi tutti quelli dell’area corrente
        tickers.forEach((t) => {
          next[t.ID_ticker] = { ID_ticker: t.ID_ticker, ticker: t.ticker };
        });
      }
      return next;
    });
  };

  // fetch SOLO per i selezionati (in parallelo)
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
            .then((rows) => ({ tickerName: t.ticker, series: toChartSeries(rows) }))
        )
      );

      const map: Record<string, ChartDataPoint[]> = {};
      results.forEach(({ tickerName, series }) => {
        map[tickerName] = series;
      });

      setSeriesByTicker(map);
      setLastRange(range);
    } catch (e) {
      setSeriesByTicker({});
      setError(e instanceof Error ? e.message : 'Errore inatteso durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  // submit dal form (solo date)
  const handleSubmit = useCallback(
    (params: QueryParams) => {
      const range: DateRange = { start_date: params.start_date, end_date: params.end_date };
      fetchSelected(range, true);
    },
    [selectedTickers]
  );

  // pull-to-refresh dei selezionati
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

  // ====== RENDER HELPERS ======

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

          <FlatList
            data={tickers}
            keyExtractor={(item) => String(item.ID_ticker)}
            scrollEnabled={false}
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
        </>
      )}
    </View>
  );

  const renderCharts = () => {
    if (loading && !refreshing) return <LoadingSpinner message="Fetching ETF data..." />;
    if (error) return <ErrorDisplay error={error} onRetry={handleRetry} />;

    const hasSeries = Object.keys(seriesByTicker).length > 0;

    if (!hasSeries) {
      return (
        <EmptyState
          title="Nessun dato"
          message={
            Object.keys(selectedTickers).length === 0
              ? 'Seleziona uno o più ETF dalla lista e imposta le date.'
              : 'Premi Fetch per caricare i grafici degli ETF selezionati.'
          }
        />
      );
    }

    return (
      <View style={styles.seriesStack}>
        {Object.entries(seriesByTicker).map(([tickerName, serie]) => (
          <View key={tickerName} style={styles.chartCard}>
            <ETFLineChart data={serie} ticker={tickerName} />
          </View>
        ))}
      </View>
    );
  };

  // ====== RENDER ROOT ======
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        {/* filtro aree a chip */}
        <AreaChips
          areas={areas}
          selectedId={selectedArea}
          onSelect={setSelectedArea}
          loading={loading}
        />

        {/* lista selezionabile degli ETF dell’area corrente */}
        {renderTickersList()}

        {/* form con solo date + submit */}
        <ETFQueryForm onSubmit={handleSubmit} loading={loading} />

        {/* grafici dei soli selezionati */}
        <View style={styles.chartContainer}>{renderCharts()}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollView: { flex: 1 },

  // card lista tickers
  tickersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
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
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'space-between',
  },
  tickerSymbol: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  tickerId: { fontSize: 12, color: '#6B7280', marginLeft: 8 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, color: '#111827', fontWeight: '700' },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 12,
  },
  bulkBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  bulkBtnText: { fontSize: 12, color: '#111827', fontWeight: '600' },
  selectedCounter: { marginLeft: 'auto', fontSize: 12, color: '#374151', fontWeight: '600' },

  // checkbox
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxOn: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  checkboxMark: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  // grafici
  chartContainer: { flex: 1, minHeight: 300, paddingBottom: 16 },
  seriesStack: { gap: 16, paddingBottom: 24 },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});