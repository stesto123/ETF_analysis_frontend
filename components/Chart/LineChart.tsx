import React from 'react';
import { View, StyleSheet, Dimensions, Text, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ChartDataPoint } from '@/types';
import { parseCalendarId } from '@/utils/dateHelpers';

interface Props {
  data: ChartDataPoint[];
  ticker: string;
}

export default function ETFLineChart({ data, ticker }: Props) {
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available for chart</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;

  // Prepare chart data
  const prices = data.map(item => item.price);
  const labels = data.map((item, index) => {
    // Show every 3rd label to avoid crowding
    if (index % Math.ceil(data.length / 4) === 0) {
      return parseCalendarId(parseInt(item.date));
    }
    return '';
  });

  const chartData = {
    labels,
    datasets: [
      {
        data: prices,
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Blue color
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#3B82F6',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#E5E7EB',
      strokeWidth: 1,
    },
  };

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const percentageChange = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{ticker} Price Chart</Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Change</Text>
              <Text style={[
                styles.statValue, 
                { color: percentageChange >= 0 ? '#10B981' : '#EF4444' }
              ]}>
                {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(2)}%
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Range</Text>
              <Text style={styles.statValue}>
                €{minPrice.toFixed(2)} - €{maxPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
        
        <LineChart
          data={chartData}
          width={Math.max(chartWidth, data.length * 50)}
          height={220}
          chartConfig={chartConfig}
          bezier={false}
          style={styles.chart}
          withDots={true}
          withShadow={false}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          onDataPointClick={({ value, index }) => {
            const point = data[index];
            alert(`Date: ${parseCalendarId(parseInt(point.date))}\nPrice: €${value.toFixed(2)}\nVolume: ${point.volume.toLocaleString()}`);
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  chart: {
    borderRadius: 16,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});