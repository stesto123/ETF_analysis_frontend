import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, LayoutChangeEvent, Pressable } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ChartDataPoint } from '@/types';
import { getLineColor as importedGetLineColor } from '@/utils/linePalette';
import { useTheme } from '@/components/common/ThemeProvider';
import { useChartSettings } from '@/components/common/ChartSettingsProvider';

// fallback nel caso l'import runtime fallisca (metro bundler edge case)
const getLineColor = (idx: number) => {
  if (typeof importedGetLineColor === 'function') return importedGetLineColor(idx);
  const FALLBACK = ['#007AFF', '#FF3B30', '#34C759', '#FF9500'];
  return FALLBACK[idx % FALLBACK.length];
};

type YAxisFormat = 'currency' | 'percent' | undefined;

interface SingleProps {
  data: ChartDataPoint[];
  ticker: string;
  height?: number;
  multi?: undefined;
  /**
   * Maximum number of points to render. If the input series has more points, it will be
   * downsampled uniformly to approximately this size. Defaults to 60.
   */
  maxPoints?: number;
  /** Force y-axis tick format. If omitted, a heuristic is used. */
  yAxisFormat?: YAxisFormat;
  /** Currency symbol used when yAxisFormat is 'currency'. Default: '$'. */
  currencySymbol?: string;
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
  /**
   * Maximum number of points to render. If the input series has more points, it will be
   * downsampled uniformly to approximately this size. Defaults to 60.
   */
  maxPoints?: number;
  /** Force y-axis tick format. If omitted, a heuristic is used. */
  yAxisFormat?: YAxisFormat;
  /** Currency symbol used when yAxisFormat is 'currency'. Default: '$'. */
  currencySymbol?: string;
}

type Props = SingleProps | MultiProps;

const CONTAINER_PADDING = 10;
const CHART_ASPECT = 0.55;
const MIN_HEIGHT = 160;
const MAX_HEIGHT = 360;

export default function ETFLineChart(props: Props) {
  const { colors } = useTheme();
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const onContainerLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);
  // tooltip state
  const [activePoint, setActivePoint] = useState<{
    x: number; // pixel x inside chart area
    y: number; // pixel y inside chart area
    value: number;
    label: string;
    color?: string;
  } | null>(null);
  // In React Native, setTimeout returns a number (not NodeJS.Timeout) when using the JS runtime.
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setActivePoint(null), 2800);
  };
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  // (isPercentageLike moved lower after required variables are declared)

  const isMulti = Array.isArray((props as MultiProps).multi);
  const innerWidth =
    containerWidth != null ? Math.max(140, containerWidth - CONTAINER_PADDING * 2) : undefined;

  // ===== costruzione dati =====
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});

  const multiKeys = useMemo(() => {
    if (!isMulti) return [] as string[];
    const mp = (props as MultiProps).multi || [];
    return mp.map((s, i) => `${s.ticker ?? s.label}__${i}`);
  }, [isMulti, props]);

  useEffect(() => {
    if (!isMulti) return;
    const keys = multiKeys;
    let changed = false;
    if (keys.length !== Object.keys(visibleMap).length) changed = true;
    else {
      for (const k of keys) {
        if (!(k in visibleMap)) { changed = true; break; }
      }
    }
    if (changed) {
      const m: Record<string, boolean> = {};
      keys.forEach((k) => (m[k] = true));
      setVisibleMap(m);
    }
  }, [isMulti, multiKeys, visibleMap]);

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

      // Condense date-like labels to readable short forms WITH YEAR (e.g., 2025-09-17 -> 17 Sep 2025)
      const condensed = lbls.map((raw) => {
        if (!raw) return raw;
        // ISO date pattern
        const isoMatch = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
        if (isoMatch) {
          const [, y, m, d] = isoMatch;
          const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const mIdx = parseInt(m, 10) - 1;
            return `${parseInt(d,10)} ${monthNames[mIdx]} ${y}`;
        }
        // DateTime pattern with time
        const dateTime = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})[ T](\d{2}):(\d{2})/);
        if (dateTime) {
          const [, y, m, d] = dateTime;
          const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const mIdx = parseInt(m, 10) - 1;
          return `${parseInt(d,10)} ${monthNames[mIdx]} ${y}`;
        }
        // Already short enough
        if (raw.length <= 6) return raw;
        return raw;
      });
      return { labels: condensed, datasets: ds, title: 'Selected ETFs', legendItems };
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

  // ===== Downsampling to keep charts lightweight =====
  const { maxPoints: globalMaxPoints } = useChartSettings();
  const maxPoints = (props as any).maxPoints ?? globalMaxPoints ?? 60; // default standard cap

  const { dsLabels, dsDatasets } = useMemo(() => {
    // Build a uniform index selection up to maxPoints
    const pickIndices = (n: number, target: number): number[] => {
      if (!Number.isFinite(n) || n <= 0) return [];
      if (!Number.isFinite(target) || target <= 0) return Array.from({ length: n }, (_, i) => i);
      if (n <= target) return Array.from({ length: n }, (_, i) => i);
      const steps = target - 1;
      const step = (n - 1) / steps; // ensure first and last included
      const idxs: number[] = [];
      for (let i = 0; i < target; i++) idxs.push(Math.round(i * step));
      // dedupe and clamp
      const set = new Set<number>();
      for (const v of idxs) {
        const vv = Math.min(n - 1, Math.max(0, v));
        set.add(vv);
      }
      return Array.from(set.values()).sort((a, b) => a - b);
    };

    // Determine base length for multi from labels if available, else from first dataset
    if (isMulti) {
      const n = (labels && labels.length) || ((fullDatasets as any[])?.[0]?.data?.length ?? 0);
      const keep = pickIndices(n, maxPoints);
      if (keep.length === 0) return { dsLabels: labels, dsDatasets: fullDatasets };
      const pickArray = <T,>(arr: T[] | undefined) => (Array.isArray(arr) ? keep.map((i) => arr[i]).filter((v) => v !== undefined) : arr);
      const newLabels = Array.isArray(labels) && labels.length === n ? pickArray(labels) : labels;
      const newDatasets = (fullDatasets as any[]).map((d) => ({
        ...d,
        data: pickArray(d.data),
      }));
      return { dsLabels: newLabels as typeof labels, dsDatasets: newDatasets as typeof fullDatasets };
    } else {
      const d0 = (fullDatasets as any[])?.[0]?.data as number[] | undefined;
      const n = d0?.length ?? 0;
      const keep = pickIndices(n, maxPoints);
      if (keep.length === 0) return { dsLabels: labels, dsDatasets: fullDatasets };
      const pickArray = <T,>(arr: T[] | undefined) => (Array.isArray(arr) ? keep.map((i) => arr[i]).filter((v) => v !== undefined) : arr);
      const newLabels = Array.isArray(labels) && labels.length === n ? pickArray(labels) : labels;
      const newDataset0 = (fullDatasets as any[])[0]
        ? { ...(fullDatasets as any[])[0], data: pickArray(d0) }
        : (fullDatasets as any[])[0];
      return { dsLabels: newLabels as typeof labels, dsDatasets: [newDataset0] as typeof fullDatasets };
    }
  }, [isMulti, labels, fullDatasets, maxPoints]);

  // apply visibility filter to datasets
  const datasets = useMemo(() => {
    if (!isMulti) return dsDatasets as any;
    return (dsDatasets as any[]).filter((d) => visibleMap[(d as any).key] !== false);
  }, [dsDatasets, visibleMap, isMulti]);

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
    backgroundColor: colors.chartBackground,
    backgroundGradientFrom: colors.chartBackground,
    backgroundGradientTo: colors.chartBackground,
    backgroundGradientFromOpacity: 1,
    backgroundGradientToOpacity: 1,
      decimalPlaces: 2,
      color: () => colors.text, // non usato per le linee (ogni dataset ha il suo color)
  labelColor: () => colors.secondaryText,
      propsForBackgroundLines: {
        stroke: colors.chartGrid,
        strokeDasharray: '',
        strokeWidth: 1,
      },
      style: { borderRadius: 16 },
  propsForDots: { r: '0', strokeWidth: '0', stroke: 'transparent' },
    }),
    [colors]
  );

  // detect compact mode from datasets count; mirrors logic above
  const isCompact = isMulti && Array.isArray((props as MultiProps).multi) && (props as MultiProps).multi.length >= 8;

  // Heuristic: if multi and first dataset values appear within -200..200 and many have abs < 120
  // OR title contains '%' treat as percentage.
  const isPercentageLike = useMemo(() => {
    // If caller forces unit, honor it
    if ((props as any).yAxisFormat === 'percent') return true;
    if ((props as any).yAxisFormat === 'currency') return false;
    if (!isMulti) return false;
    if (/\%/i.test(title)) return true;
    const ds0 = (datasets as any[])?.[0]?.data as number[] | undefined;
    if (!ds0 || ds0.length < 2) return false;
    const sample = ds0.slice(0, Math.min(40, ds0.length));
    const withinRange = sample.filter(v => Math.abs(v) <= 200).length / sample.length;
    return withinRange > 0.9;
  }, [isMulti, datasets, title]);

  // Precompute which indices to show to avoid overlap: first, last, and ~4 evenly spaced in between
  const sparseLabelSet = useMemo(() => {
    const base = (dsLabels as string[] | undefined) ?? (labels as string[] | undefined);
    if (!base) return new Set<string>();
    const n = base.length;
    if (n <= 10) return new Set(base.filter((v) => v));
    const desired = 6; // total ticks including ends
    const innerNeeded = desired - 2;
    const step = (n - 1) / (innerNeeded + 1);
    const keepIdx = new Set<number>();
    keepIdx.add(0);
    keepIdx.add(n - 1);
    for (let k = 1; k <= innerNeeded; k++) {
      keepIdx.add(Math.round(k * step));
    }
    const result = new Set<string>();
    Array.from(keepIdx.values()).sort((a,b)=>a-b).forEach(i => {
      if (base[i]) result.add(base[i]);
    });
    return result;
  }, [dsLabels, labels]);

  const formatXLabel = (xValue: string) => (sparseLabelSet.has(xValue) ? xValue : '');

  // Y-axis tick formatter based on explicit format prop or heuristic
  const formatYLabel = useMemo(() => {
    const fmt: YAxisFormat | undefined = (props as any).yAxisFormat;
    const currencySymbol = (props as any).currencySymbol || '$';
    if (fmt === 'percent') {
      return (val: string) => {
        const n = Number(val);
        return Number.isFinite(n) ? `${Math.round(n)}%` : val;
      };
    }
    if (fmt === 'currency') {
      return (val: string) => {
        const n = Number(val);
        return Number.isFinite(n) ? `${currencySymbol}${Math.round(n)}` : val;
      };
    }
    // fallback: use heuristic
    return (val: string) => {
      const n = Number(val);
      if (!Number.isFinite(n)) return val;
      return isPercentageLike ? `${Math.round(n)}%` : `$${Math.round(n)}`;
    };
  }, [(props as any).yAxisFormat, (props as any).currencySymbol, isPercentageLike]);

  // ===== Legend layout heuristic =====
  const legendLayout = useMemo(() => {
    if (!isMulti || !legendItems) return 'none';
    const count = legendItems.length;
    const cw = containerWidth || 0;
    // Determine longest label length
    const longest = legendItems.reduce((m, s) => Math.max(m, s.label.length), 0);
    // Heuristics: if narrow width (<380) OR many items (>8) OR very long labels (>25 chars)
    // then use stacked layout; else two-column wrap.
    if (cw && (cw < 380 || count > 8 || longest > 25)) return 'stacked';
    return 'wrap2';
  }, [isMulti, legendItems, containerWidth]);

  // legend is produced from the datasets in the useMemo for multi; fall back to empty
  // (destructured above).

  return (
  <View style={[styles.container, { backgroundColor: colors.card }]} onLayout={onContainerLayout}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>

      {innerWidth && chartHeight ? (
        hasVisibleDatasets ? (
          <View>
            <LineChart
              data={{ labels: dsLabels as any, datasets }}
              width={innerWidth}
              height={chartHeight}
              chartConfig={chartConfig}
              formatXLabel={formatXLabel}
              formatYLabel={formatYLabel}
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
              onDataPointClick={(p) => {
                // p = { index, value, x, y, dataset }
                // Determine label from dsLabels if available
                const baseLabels = dsLabels as string[] | undefined;
                const label = baseLabels && baseLabels[p.index] ? String(baseLabels[p.index]) : `#${p.index + 1}`;
                const pointColor = (p.dataset as any)?.color?.() ?? colors.text;
                setActivePoint({ x: p.x, y: p.y, value: p.value, label, color: pointColor });
                scheduleHide();
              }}
            />
            {activePoint && (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill]}> 
                {/* Vertical guide line */}
                <View
                  style={{
                    position: 'absolute',
                    left: activePoint.x - 1,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    backgroundColor: activePoint.color || colors.accent,
                    opacity: 0.6,
                  }}
                />
                {/* Tooltip bubble */}
                <View
                  style={{
                    position: 'absolute',
                    left: Math.min(Math.max(activePoint.x - 60, 4), innerWidth - 120),
                    top: Math.max(activePoint.y - 48, 4),
                    backgroundColor: colors.card,
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    borderRadius: 8,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.border || 'rgba(0,0,0,0.15)',
                    shadowColor: '#000',
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 6,
                    maxWidth: 140,
                  }}
                >
                  <Text style={{ color: colors.secondaryText, fontSize: 11 }} numberOfLines={1}>{activePoint.label}</Text>
                  <Text style={{ color: activePoint.color || colors.text, fontWeight: '600', fontSize: 14 }}>
                    {Number.isFinite(activePoint.value)
                      ? ((props as any).yAxisFormat === 'percent' || isPercentageLike)
                        ? `${activePoint.value.toFixed(2)}%`
                        : `${(props as any).currencySymbol || '$'}${activePoint.value.toFixed(2)}`
                      : '-'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.emptyContainer, { height: chartHeight, margin: 0, backgroundColor: colors.card }]}>
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>Nessuna serie visibile. Tocca una voce in legenda per mostrarla.</Text>
          </View>
        )
      ) : (
        <View style={{ height: MIN_HEIGHT }} />
      )}
      {isMulti && legendItems && legendItems.length > 0 && legendLayout !== 'none' && (
        <View style={styles.legendContainerBottom}>
          <View style={legendLayout === 'stacked' ? styles.legendColumn : styles.legendRow}> 
            {legendItems.map((it) => {
              const hidden = visibleMap[it.key] === false;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Serie ${it.label}${hidden ? ' nascosta' : ''}`}
                  key={it.key}
                  style={[
                    legendLayout === 'stacked' ? styles.legendItemStacked : styles.legendItem,
                    hidden && styles.legendItemHidden,
                  ]}
                  onPress={() => setVisibleMap((prev) => ({ ...prev, [it.key]: !prev[it.key] }))}
                >
                  <View style={[styles.legendDot, { backgroundColor: it.color, marginTop: 4 }]} />
                  <View style={styles.legendTextWrapper}>
                    <Text style={[styles.legendLabel, { color: colors.text }, hidden && styles.legendLabelHidden]}>
                      {it.label}
                    </Text>
                    {it.ticker ? (
                      <Text style={[styles.legendTicker, { color: colors.secondaryText }, hidden && styles.legendLabelHidden]}>
                        ({it.ticker})
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
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
  legendRow: { flexDirection: 'row', flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'flex-start', marginRight: 16, marginTop: 6, maxWidth: '48%' },
  legendColumn: { flexDirection: 'column', flexWrap: 'nowrap' },
  legendItemStacked: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6, paddingRight: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendLabel: { fontSize: 12, color: '#374151', flexShrink: 1, flexWrap: 'wrap' },
  legendTicker: { fontSize: 11, color: '#6B7280', marginTop: 2, flexShrink: 1, flexWrap: 'wrap' },
  legendItemHidden: { opacity: 0.45 },
  legendLabelHidden: { color: '#9CA3AF' },
  legendTextWrapper: { flex: 1 },
  legendContainerBottom: { marginTop: 8, paddingHorizontal: 4, paddingBottom: 4 },

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