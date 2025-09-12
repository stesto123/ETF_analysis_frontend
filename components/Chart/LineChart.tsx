import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, Text, LayoutChangeEvent, Pressable } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ChartDataPoint } from '@/types';
import { getLineColor as importedGetLineColor } from '@/utils/linePalette';

// fallback nel caso l'import runtime fallisca (metro bundler edge case)
const getLineColor = (idx: number) => {
  if (typeof importedGetLineColor === 'function') return importedGetLineColor(idx);
  const FALLBACK = ['#007AFF', '#FF3B30', '#34C759', '#FF9500'];
  return FALLBACK[idx % FALLBACK.length];
};

interface SingleProps {
  data: ChartDataPoint[];
  ticker: string;
  height?: number;
  multi?: undefined;
}

interface MultiSerie {
  label: string;
  ticker?: string;
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
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isMulti) return;
    const mp = (props as MultiProps).multi || [];
    // initialize visibility map if keys differ
    const keys = mp.map((s, i) => `${s.ticker ?? s.label}__${i}`);
    let changed = false;
    if (keys.length !== Object.keys(visibleMap).length) changed = true;
    else {
      for (const k of keys) if (!(k in visibleMap)) { changed = true; break; }
    }
    if (changed) {
      const m: Record<string, boolean> = {};
      keys.forEach((k) => (m[k] = true));
      setVisibleMap(m);
    }
  }, [isMulti, (props as MultiProps).multi?.length]);

  const { labels, datasets: fullDatasets, title, legendItems } = useMemo(() => {
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
  // Palette vivida ad alto contrasto (nessuna trasparenza)
      // palette importata dal file condiviso (LINE_COLORS)

  // hexToRgba removed (unused) to satisfy lint rules

      const many = mp.multi.length >= 8; // compact mode threshold
      // build datasets: vivid solid colors, ignore opacity for maximum contrast
      const ds = mp.multi.map((s, idx) => {
        const base = getLineColor(idx);
        const key = `${s.ticker ?? s.label}__${idx}`;
        return {
          key,
          data: s.data,
          color: () => base, // sempre pieno, no trasparenza
          strokeWidth: many ? 3 : 4,
          withDots: false as const,
        };
      });

      const legendItems = mp.multi.map((s, idx) => {
        const base = getLineColor(idx);
        const key = `${s.ticker ?? s.label}__${idx}`;
        return { key, label: s.label, ticker: s.ticker, color: base };
      });

      return { labels: lbls, datasets: ds, title: 'Selected ETFs', legendItems };
    } else {
      const sp = props as SingleProps;
      const prices = sp.data.map((p) => p.price);
      const first = prices[0] ?? 0;
      const last = prices[prices.length - 1] ?? first;
      const color = last >= first ? '#10B981' : '#EF4444';
      return {
        labels: sp.data.map(() => ''),
        datasets: [{ data: prices, color: () => color, strokeWidth: 3, withDots: false as const }],
        title: `${sp.ticker} Price Chart`,
        legend: [],
      };
    }
  }, [props, isMulti]);

  // apply visibility filter to datasets
  const datasets = useMemo(() => {
    if (!isMulti) return fullDatasets as any;
    return (fullDatasets as any[]).filter((d) => visibleMap[(d as any).key] !== false);
  }, [fullDatasets, visibleMap, isMulti]);

  // When all series are hidden, avoid rendering LineChart with an empty datasets array
  // as some versions of react-native-chart-kit expect datasets[0] to exist.
  const hasVisibleDatasets = useMemo(() => {
    if (!isMulti) return true;
    return Array.isArray(datasets) && datasets.length > 0;
  }, [datasets, isMulti]);

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
    backgroundGradientTo: '#F8FAFC',
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

  // legend is produced from the datasets in the useMemo for multi; fall back to empty
  // (destructured above).

  return (
  <View style={styles.container} onLayout={onContainerLayout}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {isMulti && legendItems && legendItems.length > 0 && (
          <View style={styles.legendRow}>
            {legendItems.map((it) => {
              const hidden = visibleMap[it.key] === false;
              return (
                <Pressable
                  key={it.key}
                  style={[styles.legendItem, hidden && styles.legendItemHidden]}
                  onPress={() => setVisibleMap((prev) => ({ ...prev, [it.key]: !prev[it.key] }))}
                >
                  <View style={[styles.legendDot, { backgroundColor: it.color }]} />
                  <View style={{ maxWidth: 160 }}>
                    <Text style={[styles.legendLabel, hidden && styles.legendLabelHidden]} numberOfLines={1}>
                      {it.label}
                    </Text>
                    {it.ticker ? (
                      <Text style={[styles.legendTicker, hidden && styles.legendLabelHidden]} numberOfLines={1}>
                        ({it.ticker})
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {innerWidth && chartHeight ? (
        hasVisibleDatasets ? (
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
          <View style={[styles.emptyContainer, { height: chartHeight, margin: 0 }]}>
            <Text style={styles.emptyText}>Nessuna serie visibile. Tocca una voce in legenda per mostrarla.</Text>
          </View>
        )
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
  legendTicker: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  legendItemHidden: { opacity: 0.45 },
  legendLabelHidden: { color: '#9CA3AF' },

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