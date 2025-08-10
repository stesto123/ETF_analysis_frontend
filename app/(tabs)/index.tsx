import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import ETFQueryForm from '@/components/Form/ETFQueryForm';
import ETFLineChart from '@/components/Chart/LineChart';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { apiService } from '@/services/api';
import { ETFData, QueryParams, ChartDataPoint } from '@/types';

export default function HomeScreen() {
  const [data, setData] = useState<ETFData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastParams, setLastParams] = useState<QueryParams | null>(null);
  const [ticker, setTicker] = useState<string>('');
  const [areas, setAreas] = useState<{ area_geografica: string, id_area_geografica: number }[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [tickers, setTickers] = useState<{ ID_ticker: number, ticker: string }[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<number | null>(null);

  useEffect(() => {
    apiService.getGeographicAreas().then(setAreas).catch(() => setAreas([]));
  }, []);

  useEffect(() => {
    if (selectedArea) {
      apiService.getTickersByArea(selectedArea).then(setTickers).catch(() => setTickers([]));
      setSelectedTicker(null);
    } else {
      setTickers([]);
      setSelectedTicker(null);
    }
  }, [selectedArea]);

  const transformDataForChart = (etfData: ETFData[]): ChartDataPoint[] => {
    return etfData
      .sort((a, b) => a.calendar_id - b.calendar_id)
      .map(item => ({
        date: item.calendar_id.toString(),
        price: parseFloat(item.close_price),
        volume: item.volume,
      }));
  };

  const fetchData = async (params: QueryParams, useCache: boolean = true) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.fetchETFData(params, useCache);
      setData(result);
      setLastParams(params);
      
      if (result.length > 0) {
        setTicker(result[0].ticker);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    if (!lastParams) return;
    
    setRefreshing(true);
    try {
      await fetchData(lastParams, false); // Force fresh data
    } finally {
      setRefreshing(false);
    }
  }, [lastParams]);

  const handleRetry = () => {
    if (lastParams) {
      fetchData(lastParams, false);
    }
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return <LoadingSpinner message="Fetching ETF data..." />;
    }

    if (error) {
      return <ErrorDisplay error={error} onRetry={handleRetry} />;
    }

    if (data.length === 0 && !loading) {
      return (
        <EmptyState
          title="No Data Available"
          message="Enter a ticker ID and date range to view ETF analytics"
        />
      );
    }

    const chartData = transformDataForChart(data);
    return <ETFLineChart data={chartData} ticker={ticker} />;
  };

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
        <ETFQueryForm
          areas={areas}
          selectedArea={selectedArea}
          onAreaChange={setSelectedArea}
          tickers={tickers}
          selectedTicker={selectedTicker}
          onTickerChange={setSelectedTicker}
          onSubmit={fetchData}
          loading={loading}
        />
        <View style={styles.chartContainer}>
          {renderContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  chartContainer: {
    flex: 1,
    minHeight: 300,
  },
});