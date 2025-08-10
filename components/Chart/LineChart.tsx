import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Text, LayoutChangeEvent } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ChartDataPoint } from '@/types';

interface SingleProps {
  data: ChartDataPoint[];
  ticker: string;
  height?: number;
  multi?: undefined;
}

interface MultiSerie {
  label: string;
  data: number[];
  colorHint?: 'up' | 'down';
}
interface MultiProps {
  multi: MultiSerie[];
  // legacy props non usate in multi
  data: ChartDataPoint[];
  ticker: string;
  height?: number;
}

type Props = SingleProps | MultiProps;

const CONTAINER_PADDING = 16;
const CHART_ASPECT = 0.7;
const MIN_HEIGHT = 260;
const MAX_HEIGHT = 480;

export default function ETFLineChart(props: Props) {
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const onContainerLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  const isMulti = Array.isArray((props as MultiProps).multi);
  const innerWidth =
    containerWidth != null ? Math.max(140, containerWidth - CONTAINER_PADDING * 2) : undefined;

  // ===== costruzione dati =====
  const { labels, datasets, title } = useMemo(() => {
    if (isMulti) {
      const mp = props as MultiProps;
      // nessuna label asse x
      const lbls = mp.multi.length ? new Array(mp.multi[0].data.length).fill('') : [];
      // colore per serie: verde se up, rosso se down
      const ds = mp.multi.map((s) => {
        const first = s.data[0] ?? 0;
        const last = s.data[s.data.length - 1] ?? first;
        const up = (s.colorHint ?? (last >= first ? 'up' : 'down')) === 'up';
        const color = up ? '#10B981' : '#EF4444';
        return {
          data: s.data,
          color: () => color,
          strokeWidth: 2,
          withDots: false as const,
        };
      });
      return { labels: lbls, datasets: ds, title: 'Selected ETFs' };
    } else {
      const sp = props as SingleProps;
      const prices = sp.data.map((p) => p.price);
      const first = prices[0] ?? 0;
      const last = prices[prices.length - 1] ?? first;
      const color = last >= first ? '#10B981' : '#EF4444';
      return {
        labels: sp.data.map(() => ''),
        datasets: [{ data: prices, color: () => color, strokeWidth: 2, withDots: false as const }],
        title: `${sp.ticker} Price Chart`,
      };
    }
  }, [props, isMulti]);

  const chartHeight = useMemo(() => {
    const h =
      'height' in props && props.height
        ? props.height
        : innerWidth != null
        ? Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(innerWidth * CHART_ASPECT)))
        : undefined;
    return h;
  }, [innerWidth, props]);

  const chartConfig = useMemo(
    () => ({
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      backgroundGradientFromOpacity: 1,
      backgroundGradientToOpacity: 1,
      decimalPlaces: 2,
      color: () => '#111827', // non usato per le linee (ogni dataset ha il suo color)
      labelColor: () => 'rgba(0,0,0,0)', // niente assi
      propsForBackgroundLines: {
        stroke: 'transparent',
        strokeDasharray: '',
        strokeWidth: 0,
      },
      style: { borderRadius: 16 },
      propsForDots: { r: '0', strokeWidth: '0', stroke: 'transparent' },
    }),
    []
  );

  // Legend (solo in multi)
  const legend = isMulti
    ? (props as MultiProps).multi.map((s) => {
        const first = s.data[0] ?? 0;
        const last = s.data[s.data.length - 1] ?? first;
        const up = (s.colorHint ?? (last >= first ? 'up' : 'down')) === 'up';
        return { label: s.label, color: up ? '#10B981' : '#EF4444' };
      })
    : [];

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {isMulti && legend.length > 0 && (
          <View style={styles.legendRow}>
            {legend.map((l) => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {l.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {innerWidth && chartHeight ? (
        <LineChart
          data={{ labels, datasets }}
          width={innerWidth}
          height={chartHeight}
          chartConfig={chartConfig}
          bezier={false}
          style={styles.chart}
          withDots={false}
          withShadow={false}        // <- NIENTE ALONE
          withVerticalLabels={false}
          withHorizontalLabels={false}
          withInnerLines={false}
          withOuterLines={false}
          fromZero={false}
          yLabelsOffset={0}
          xLabelsOffset={0}
          onDataPointClick={undefined}
        />
      ) : (
        <View style={{ height: MIN_HEIGHT }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    padding: CONTAINER_PADDING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  header: { marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#111827' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginTop: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendLabel: { fontSize: 12, color: '#374151', maxWidth: 120 },

  chart: { borderRadius: 16 },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emptyText: { fontSize: 16, color: '#6B7280', textAlign: 'center' },
});