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
  labels?: string[]; // optional shared x labels
}
interface MultiProps {
  multi: MultiSerie[];
  // legacy props non usate in multi
  data: ChartDataPoint[];
  ticker: string;
  height?: number;
}

type Props = SingleProps | MultiProps;

const CONTAINER_PADDING = 10;
const CHART_ASPECT = 0.55;
const MIN_HEIGHT = 160;
const MAX_HEIGHT = 360;

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
      // attempt to use provided shared labels from the first series
      let lbls = mp.multi.length && Array.isArray(mp.multi[0].labels) && mp.multi[0].labels!.length
        ? mp.multi[0].labels!
        : mp.multi.length
        ? new Array(mp.multi[0].data.length).fill('')
        : [];
      // if labels are all empty or missing, build a safe fallback with sparse numeric ticks
      if (lbls.length > 0 && lbls.every((v) => !v || String(v).trim() === '')) {
        const n = mp.multi[0].data.length;
        const step = Math.max(1, Math.ceil(n / 6));
        lbls = Array.from({ length: n }, (_, i) => (i % step === 0 ? String(i + 1) : ''));
      }
      // colore per serie: verde se up, rosso se down
      const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F472B6'];

      // helper to convert hex to rgba string
      const hexToRgba = (hex: string, alpha = 1) => {
        const h = hex.replace('#', '');
        const bigint = parseInt(h, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };

      const many = mp.multi.length >= 8; // compact mode threshold
      const ds = mp.multi.map((s, idx) => {
        // pick a distinct color from palette per series
        const base = PALETTE[idx % PALETTE.length];
        const color = many ? hexToRgba(base, 0.55) : base;
        return {
          data: s.data,
          color: () => color,
          strokeWidth: many ? 1 : 2,
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
  labelColor: () => '#6B7280',
      propsForBackgroundLines: {
        stroke: '#E5E7EB',
        strokeDasharray: '',
        strokeWidth: 1,
      },
      style: { borderRadius: 16 },
  propsForDots: { r: '0', strokeWidth: '0', stroke: 'transparent' },
    }),
    []
  );

  // detect compact mode from datasets count; mirrors logic above
  const isCompact = isMulti && Array.isArray((props as MultiProps).multi) && (props as MultiProps).multi.length >= 8;

  // formatXLabel: show only a subset of labels to avoid overcrowding
  const formatXLabel = (xValue: string) => {
    if (!labels || labels.length <= 6) return xValue;
    const step = Math.max(1, Math.ceil(labels.length / 6));
    const idx = labels.indexOf(xValue);
    if (idx === -1) return xValue;
    return idx % step === 0 ? xValue : '';
  };

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
          formatXLabel={formatXLabel}
          bezier={false}
          style={styles.chart}
          withDots={false}
          withShadow={false}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withInnerLines={!isCompact}
          withOuterLines={!isCompact}
          fromZero={false}
          yLabelsOffset={4}
          xLabelsOffset={4}
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