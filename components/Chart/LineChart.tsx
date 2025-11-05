import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, LayoutChangeEvent, Pressable, PanResponder } from 'react-native';
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const distanceBetweenTouches = (touches: readonly { pageX: number; pageY: number }[]) => {
  if (!touches || touches.length < 2) return 0;
  const [a, b] = touches;
  const dx = a.pageX - b.pageX;
  const dy = a.pageY - b.pageY;
  return Math.sqrt(dx * dx + dy * dy);
};

const withAlpha = (hexColor: string, alpha: number) => {
  if (!hexColor || typeof hexColor !== 'string') return `rgba(59, 130, 246, ${alpha})`;
  let hex = hexColor.trim();
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (hex.length !== 6) return `rgba(59, 130, 246, ${alpha})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export default function ETFLineChart(props: Props) {
  const { colors, isDark } = useTheme();
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
  const filteredDatasets = useMemo(() => {
    if (!isMulti) return dsDatasets as any;
    return (dsDatasets as any[]).filter((d) => visibleMap[(d as any).key] !== false);
  }, [dsDatasets, visibleMap, isMulti]);

  const totalPoints = useMemo(() => {
    if (!Array.isArray(filteredDatasets) || filteredDatasets.length === 0) return 0;
    const first = (filteredDatasets as any[])[0]?.data;
    return Array.isArray(first) ? first.length : 0;
  }, [filteredDatasets]);

  const [viewWindow, setViewWindow] = useState<{ start: number; end: number } | null>(null);
  const prevTotalPointsRef = useRef<number>(0);

  const runtimeRef = useRef({
    innerWidth: 0,
    totalPoints: 0,
    minSpan: 1,
    activeWindow: null as { start: number; end: number } | null,
    interactive: false,
  });

  const gestureTrackingRef = useRef({
    mode: null as 'pan' | 'pinch' | null,
    initialWindow: null as { start: number; end: number } | null,
    initialDistance: 0,
  });

  const miniMapTrackingRef = useRef({
    mode: null as 'move' | 'resize-left' | 'resize-right' | null,
    initialWindow: null as { start: number; end: number } | null,
  });

  useEffect(() => {
    if (totalPoints <= 0) {
      setViewWindow(null);
      prevTotalPointsRef.current = totalPoints;
      return;
    }

    if (prevTotalPointsRef.current !== totalPoints) {
      setViewWindow({ start: 0, end: totalPoints });
      prevTotalPointsRef.current = totalPoints;
      return;
    }

    setViewWindow((prev) => {
      if (!prev) return { start: 0, end: totalPoints };
      let start = Math.max(0, Math.min(totalPoints - 1, Math.round(prev.start)));
      let end = Math.max(start + 1, Math.min(totalPoints, Math.round(prev.end)));
      if (end - start <= 0) end = Math.min(totalPoints, start + 1);
      if (prev.start === start && prev.end === end) return prev;
      return { start, end };
    });

    prevTotalPointsRef.current = totalPoints;
  }, [totalPoints]);

  const activeWindow = useMemo(() => {
    if (totalPoints <= 0) return null;
    const base = viewWindow ?? { start: 0, end: totalPoints };
    let start = Math.max(0, Math.min(totalPoints - 1, Math.round(base.start)));
    let end = Math.max(start + 1, Math.min(totalPoints, Math.round(base.end)));
    if (end - start <= 0) end = Math.min(totalPoints, start + 1);
    return { start, end };
  }, [viewWindow, totalPoints]);

  useEffect(() => {
    setActivePoint(null);
  }, [activeWindow?.start, activeWindow?.end]);

  // When all series are hidden, avoid rendering LineChart with an empty datasets array
  // as some versions of react-native-chart-kit expect datasets[0] to exist.
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

  const forcedFormat: YAxisFormat | undefined = (props as any).yAxisFormat;
  const forcedCurrencySymbol: string | undefined = (props as any).currencySymbol;

  // Heuristic: if multi and first dataset values appear within -200..200 and many have abs < 120
  // OR title contains '%' treat as percentage.
  const isPercentageLike = useMemo(() => {
    // If caller forces unit, honor it
    if (forcedFormat === 'percent') return true;
    if (forcedFormat === 'currency') return false;
    if (!isMulti) return false;
    if (/%/i.test(title)) return true;
    const ds0 = (filteredDatasets as any[])?.[0]?.data as number[] | undefined;
    if (!ds0 || ds0.length < 2) return false;
    const sample = ds0.slice(0, Math.min(40, ds0.length));
    const withinRange = sample.filter(v => Math.abs(v) <= 200).length / sample.length;
    return withinRange > 0.9;
  }, [isMulti, filteredDatasets, title, forcedFormat]);

  const fullLabels = useMemo<string[]>(() => {
    const arr = (dsLabels as string[] | undefined) ?? (labels as string[] | undefined) ?? [];
    return Array.isArray(arr) ? arr : [];
  }, [dsLabels, labels]);

  const windowedLabels = useMemo(() => {
    if (!activeWindow) return fullLabels;
    return fullLabels.slice(activeWindow.start, activeWindow.end);
  }, [fullLabels, activeWindow]);

  const windowedDatasets = useMemo(() => {
    if (!activeWindow) return filteredDatasets;
    const { start, end } = activeWindow;
    return (filteredDatasets as any[]).map((d) => {
      const dataArray = Array.isArray((d as any).data) ? (d as any).data.slice(start, end) : (d as any).data;
      return { ...d, data: dataArray };
    });
  }, [filteredDatasets, activeWindow]);

  const hasVisibleDatasets = useMemo(() => {
    if (!Array.isArray(windowedDatasets) || windowedDatasets.length === 0) return false;
    return (windowedDatasets as any[]).some((d) => Array.isArray((d as any).data) && (d as any).data.length > 0);
  }, [windowedDatasets]);

  const activeSpan = activeWindow ? activeWindow.end - activeWindow.start : 0;
  const interactiveEnabled = innerWidth != null && innerWidth > 0 && activeWindow != null && totalPoints > 6;
  const computedMinSpan = totalPoints <= 5 ? 1 : Math.max(3, Math.round(totalPoints * 0.15));
  const isZoomed = interactiveEnabled && activeSpan < totalPoints;

  runtimeRef.current.innerWidth = innerWidth ?? 0;
  runtimeRef.current.totalPoints = totalPoints;
  runtimeRef.current.minSpan = Math.max(1, Math.min(totalPoints, computedMinSpan));
  runtimeRef.current.activeWindow = activeWindow;
  runtimeRef.current.interactive = interactiveEnabled;

  const handleResetZoom = useCallback(() => {
    if (totalPoints <= 0) return;
    setViewWindow((prev) => {
      if (prev && prev.start === 0 && prev.end === totalPoints) return prev;
      return { start: 0, end: totalPoints };
    });
  }, [totalPoints]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          const runtime = runtimeRef.current;
          if (!runtime.interactive || runtime.totalPoints <= 0 || runtime.innerWidth <= 0) return false;
          if (evt.nativeEvent.touches.length >= 2) return true;
          return Math.abs(gestureState.dx) > 12;
        },
        onPanResponderGrant: (evt) => {
          const runtime = runtimeRef.current;
          if (!runtime.interactive || !runtime.activeWindow) return;
          setActivePoint(null);
          const touches = evt.nativeEvent.touches;
          gestureTrackingRef.current.initialWindow = runtime.activeWindow;
          gestureTrackingRef.current.mode = touches.length >= 2 ? 'pinch' : 'pan';
          gestureTrackingRef.current.initialDistance = touches.length >= 2 ? distanceBetweenTouches(touches) : 0;
        },
        onPanResponderMove: (evt, gestureState) => {
          const runtime = runtimeRef.current;
          if (!runtime.interactive || !runtime.activeWindow) return;
          const touches = evt.nativeEvent.touches;
          const tracker = gestureTrackingRef.current;

          if (touches.length >= 2) {
            if (tracker.mode !== 'pinch') {
              tracker.mode = 'pinch';
              tracker.initialWindow = runtime.activeWindow;
              tracker.initialDistance = distanceBetweenTouches(touches);
            }
            if (!tracker.initialWindow) return;
            const dist = distanceBetweenTouches(touches);
            if (!dist || !tracker.initialDistance) return;
            const scale = dist / tracker.initialDistance;
            if (!Number.isFinite(scale) || scale <= 0) return;
            const initial = tracker.initialWindow;
            const initialSpan = initial.end - initial.start;
            if (initialSpan <= 0) return;
            let nextSpan = Math.round(initialSpan * scale);
            const minSpan = runtime.minSpan;
            const total = runtime.totalPoints;
            nextSpan = Math.max(minSpan, Math.min(total, nextSpan));
            if (nextSpan >= total) {
              setViewWindow((prev) => {
                if (prev && prev.start === 0 && prev.end === total) return prev;
                return { start: 0, end: total };
              });
              return;
            }
            const center = (initial.start + initial.end) / 2;
            let nextStart = Math.round(center - nextSpan / 2);
            nextStart = clamp(nextStart, 0, total - nextSpan);
            const nextEnd = Math.min(total, nextStart + nextSpan);
            setViewWindow((prev) => {
              if (prev && prev.start === nextStart && prev.end === nextEnd) return prev;
              return { start: nextStart, end: nextEnd };
            });
            return;
          }

          if (tracker.mode !== 'pan') {
            tracker.mode = 'pan';
            tracker.initialWindow = runtime.activeWindow;
          }
          if (!tracker.initialWindow) return;
          const span = tracker.initialWindow.end - tracker.initialWindow.start;
          if (span <= 0 || span >= runtime.totalPoints) return;
          const inner = runtime.innerWidth || 1;
          const pointsPerPixel = span / inner;
          const shift = Math.round(gestureState.dx * pointsPerPixel);
          let nextStart = tracker.initialWindow.start - shift;
          nextStart = clamp(nextStart, 0, runtime.totalPoints - span);
          const nextEnd = nextStart + span;
          setViewWindow((prev) => {
            if (prev && prev.start === nextStart && prev.end === nextEnd) return prev;
            return { start: nextStart, end: nextEnd };
          });
        },
        onPanResponderRelease: () => {
          gestureTrackingRef.current.mode = null;
        },
        onPanResponderTerminate: () => {
          gestureTrackingRef.current.mode = null;
        },
        onPanResponderTerminationRequest: () => true,
      }),
    []
  );

  const commitViewWindow = useCallback((nextStart: number, nextEnd: number) => {
    setViewWindow((prev) => {
      const runtime = runtimeRef.current;
      const total = runtime.totalPoints;
      if (total <= 0) return prev;
      const minSpan = Math.max(1, runtime.minSpan);
      let clampedStart = Math.round(nextStart);
      let clampedEnd = Math.round(nextEnd);
      if (!Number.isFinite(clampedStart)) clampedStart = prev?.start ?? 0;
      if (!Number.isFinite(clampedEnd)) clampedEnd = prev?.end ?? total;
      if (clampedStart < 0) clampedStart = 0;
      if (clampedEnd > total) clampedEnd = total;
      if (clampedEnd - clampedStart < minSpan) {
        clampedEnd = Math.min(total, clampedStart + minSpan);
      }
      if (clampedStart > total - minSpan) {
        clampedStart = Math.max(0, total - minSpan);
        clampedEnd = total;
      }
      if (prev && prev.start === clampedStart && prev.end === clampedEnd) return prev;
      return { start: clampedStart, end: clampedEnd };
    });
  }, [setViewWindow]);

  const pointsPerPixel = useMemo(() => {
    if (!innerWidth || innerWidth <= 0 || totalPoints <= 0) return 0;
    return totalPoints / innerWidth;
  }, [innerWidth, totalPoints]);

  const miniMapHeight = useMemo(() => {
    if (!innerWidth || innerWidth <= 0) return 56;
    return Math.max(40, Math.min(90, Math.round(innerWidth * 0.18)));
  }, [innerWidth]);

  const miniMapLabels = useMemo(() => {
    if (!fullLabels.length) return [] as string[];
    const step = Math.max(1, Math.ceil(fullLabels.length / 8));
    return fullLabels.map((label, index) => (index % step === 0 ? label : ''));
  }, [fullLabels]);

  const miniMapSelection = useMemo(() => {
    if (!innerWidth || !activeWindow || totalPoints <= 0) {
      return { left: 0, width: 0 };
    }
    const total = totalPoints;
    const span = Math.max(1, activeWindow.end - activeWindow.start);
    const startRatio = activeWindow.start / total;
    const spanRatio = span / total;
    const widthPx = Math.max(12, spanRatio * innerWidth);
    const leftPx = clamp(startRatio * innerWidth, 0, Math.max(0, innerWidth - widthPx));
    return { left: leftPx, width: Math.min(widthPx, innerWidth) };
  }, [innerWidth, activeWindow, totalPoints]);

  const miniMapShadeWidths = useMemo(() => {
    const totalWidth = innerWidth ?? 0;
    const leftWidth = Math.max(0, Math.min(miniMapSelection.left, totalWidth));
    const rightWidth = Math.max(0, totalWidth - (miniMapSelection.left + miniMapSelection.width));
    return { left: leftWidth, right: rightWidth };
  }, [innerWidth, miniMapSelection.left, miniMapSelection.width]);

  const miniMapChartConfig = useMemo(
    () => ({
      backgroundColor: colors.chartBackground,
      backgroundGradientFrom: colors.chartBackground,
      backgroundGradientTo: colors.chartBackground,
      backgroundGradientFromOpacity: 1,
      backgroundGradientToOpacity: 1,
      decimalPlaces: 2,
      color: () => colors.secondaryText,
      labelColor: () => colors.secondaryText,
      propsForBackgroundLines: {
        stroke: colors.chartGrid,
        strokeDasharray: '4,8',
        strokeWidth: 1,
      },
      propsForDots: { r: '0', strokeWidth: '0', stroke: 'transparent' },
    }),
    [colors]
  );

  const miniMapSelectionFill = useMemo(
    () => withAlpha(colors.accent, isDark ? 0.35 : 0.2),
    [colors.accent, isDark]
  );

  const miniMapShadeColor = useMemo(
    () => withAlpha(colors.text, isDark ? 0.45 : 0.12),
    [colors.text, isDark]
  );

  const miniMapPanResponder = useMemo(() => {
    if (!interactiveEnabled || !pointsPerPixel) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 4,
      onPanResponderGrant: () => {
        const runtime = runtimeRef.current;
        miniMapTrackingRef.current.mode = 'move';
        miniMapTrackingRef.current.initialWindow = runtime.activeWindow;
      },
      onPanResponderMove: (_, gestureState) => {
        const runtime = runtimeRef.current;
        const initial = miniMapTrackingRef.current.initialWindow ?? runtime.activeWindow;
        if (!initial || !runtime.totalPoints) return;
        const span = initial.end - initial.start;
        if (span <= 0) return;
        const deltaPoints = Math.round(gestureState.dx * pointsPerPixel);
        let nextStart = initial.start + deltaPoints;
        nextStart = clamp(nextStart, 0, runtime.totalPoints - span);
        commitViewWindow(nextStart, nextStart + span);
      },
      onPanResponderRelease: () => {
        miniMapTrackingRef.current.mode = null;
        miniMapTrackingRef.current.initialWindow = null;
      },
      onPanResponderTerminate: () => {
        miniMapTrackingRef.current.mode = null;
        miniMapTrackingRef.current.initialWindow = null;
      },
      onPanResponderTerminationRequest: () => true,
    });
  }, [interactiveEnabled, pointsPerPixel, commitViewWindow]);

  const miniMapLeftHandleResponder = useMemo(() => {
    if (!interactiveEnabled || !pointsPerPixel) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 2,
      onPanResponderGrant: () => {
        const runtime = runtimeRef.current;
        miniMapTrackingRef.current.mode = 'resize-left';
        miniMapTrackingRef.current.initialWindow = runtime.activeWindow;
      },
      onPanResponderMove: (_, gestureState) => {
        const runtime = runtimeRef.current;
        const initial = miniMapTrackingRef.current.initialWindow ?? runtime.activeWindow;
        if (!initial || !runtime.totalPoints) return;
        const deltaPoints = Math.round(gestureState.dx * pointsPerPixel);
        let nextStart = initial.start + deltaPoints;
        const maxStart = initial.end - Math.max(1, runtime.minSpan);
        nextStart = clamp(nextStart, 0, maxStart);
        commitViewWindow(nextStart, initial.end);
      },
      onPanResponderRelease: () => {
        miniMapTrackingRef.current.mode = null;
        miniMapTrackingRef.current.initialWindow = null;
      },
      onPanResponderTerminate: () => {
        miniMapTrackingRef.current.mode = null;
        miniMapTrackingRef.current.initialWindow = null;
      },
      onPanResponderTerminationRequest: () => true,
    });
  }, [interactiveEnabled, pointsPerPixel, commitViewWindow]);

  const miniMapRightHandleResponder = useMemo(() => {
    if (!interactiveEnabled || !pointsPerPixel) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 2,
      onPanResponderGrant: () => {
        const runtime = runtimeRef.current;
        miniMapTrackingRef.current.mode = 'resize-right';
        miniMapTrackingRef.current.initialWindow = runtime.activeWindow;
      },
      onPanResponderMove: (_, gestureState) => {
        const runtime = runtimeRef.current;
        const initial = miniMapTrackingRef.current.initialWindow ?? runtime.activeWindow;
        if (!initial || !runtime.totalPoints) return;
        const deltaPoints = Math.round(gestureState.dx * pointsPerPixel);
        let nextEnd = initial.end + deltaPoints;
        const minEnd = initial.start + Math.max(1, runtime.minSpan);
        nextEnd = clamp(nextEnd, minEnd, runtime.totalPoints);
        commitViewWindow(initial.start, nextEnd);
      },
      onPanResponderRelease: () => {
        miniMapTrackingRef.current.mode = null;
        miniMapTrackingRef.current.initialWindow = null;
      },
      onPanResponderTerminate: () => {
        miniMapTrackingRef.current.mode = null;
        miniMapTrackingRef.current.initialWindow = null;
      },
      onPanResponderTerminationRequest: () => true,
    });
  }, [interactiveEnabled, pointsPerPixel, commitViewWindow]);

  const visibleLabelIndices = useMemo(() => {
    const n = windowedLabels.length;
    const keep = new Set<number>();
    if (n === 0) return keep;
    if (n <= 8) {
      for (let i = 0; i < n; i++) keep.add(i);
      return keep;
    }
    const width = innerWidth ?? 0;
    const approxRaw = width ? Math.max(3, Math.floor(width / 110)) : Math.min(6, n);
    const desired = Math.min(n, Math.min(10, Math.max(3, approxRaw)));
    keep.add(0);
    keep.add(n - 1);
    const innerNeeded = Math.max(0, desired - 2);
    const step = (n - 1) / (innerNeeded + 1);
    for (let k = 1; k <= innerNeeded; k++) {
      const idx = Math.round(k * step);
      keep.add(Math.min(n - 1, Math.max(0, idx)));
    }
    return keep;
  }, [windowedLabels, innerWidth]);

  const chartLabels = useMemo(() => {
    if (windowedLabels.length === 0) return windowedLabels;
    return windowedLabels.map((label, idx) => (visibleLabelIndices.has(idx) ? label : ''));
  }, [windowedLabels, visibleLabelIndices]);

  const formatXLabel = useCallback(
    (value: string, index?: number) => {
      if (typeof index !== 'number') return value;
      return visibleLabelIndices.has(index) ? value : '';
    },
    [visibleLabelIndices]
  );

  // Y-axis tick formatter based on explicit format prop or heuristic
  const formatYLabel = useMemo(() => {
    const fmt = forcedFormat;
    const currencySymbol = forcedCurrencySymbol || '$';
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
  return isPercentageLike ? `${Math.round(n)}%` : `${currencySymbol}${Math.round(n)}`;
    };
  }, [forcedFormat, forcedCurrencySymbol, isPercentageLike]);

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
        {interactiveEnabled && isZoomed ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleResetZoom}
            style={[styles.resetButton, { borderColor: colors.border, backgroundColor: colors.background }]}
          >
            <Text style={[styles.resetButtonText, { color: colors.accent }]}>Reset zoom</Text>
          </Pressable>
        ) : null}
      </View>

      {innerWidth && chartHeight ? (
        hasVisibleDatasets ? (
          <View>
            <View style={styles.chartWrapper} {...panResponder.panHandlers}>
              <LineChart
                data={{ labels: chartLabels as any, datasets: windowedDatasets as any }}
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
                const tooltipIndex = activeWindow ? activeWindow.start + p.index : p.index;
                const tooltipLabel = fullLabels[tooltipIndex] ?? windowedLabels[p.index];
                const label = tooltipLabel && String(tooltipLabel).trim().length > 0 ? String(tooltipLabel) : `#${p.index + 1}`;
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
            {interactiveEnabled && innerWidth && totalPoints > 1 ? (
              <View style={[styles.miniMapContainer, { height: miniMapHeight }]}>
                <View style={styles.miniMapChartWrapper}>
                  <LineChart
                    data={{ labels: miniMapLabels as any, datasets: filteredDatasets as any }}
                    width={innerWidth}
                    height={miniMapHeight}
                    chartConfig={miniMapChartConfig}
                    withDots={false}
                    withShadow={false}
                    withVerticalLabels={false}
                    withHorizontalLabels={false}
                    withInnerLines={false}
                    withOuterLines={false}
                    bezier={false}
                    style={styles.miniMapChart}
                  />
                </View>
                {miniMapSelection.width > 0 ? (
                  <View
                    pointerEvents="box-none"
                    style={[styles.miniMapSelectionLayer, { width: innerWidth, height: miniMapHeight }]}
                  >
                    {miniMapShadeWidths.left > 0 ? (
                      <View
                        style={[
                          styles.miniMapShade,
                          { left: 0, width: miniMapShadeWidths.left, backgroundColor: miniMapShadeColor },
                        ]}
                      />
                    ) : null}
                    {miniMapShadeWidths.right > 0 ? (
                      <View
                        style={[
                          styles.miniMapShade,
                          {
                            left: miniMapSelection.left + miniMapSelection.width,
                            width: miniMapShadeWidths.right,
                            backgroundColor: miniMapShadeColor,
                          },
                        ]}
                      />
                    ) : null}
                    <View
                      style={[
                        styles.miniMapSelection,
                        {
                          left: miniMapSelection.left,
                          width: miniMapSelection.width,
                          borderColor: colors.accent,
                          backgroundColor: miniMapSelectionFill,
                        },
                      ]}
                      {...(miniMapPanResponder ? miniMapPanResponder.panHandlers : {})}
                    >
                      <View
                        style={[
                          styles.miniMapHandle,
                          styles.miniMapHandleLeft,
                          { borderColor: colors.accent, backgroundColor: colors.card },
                        ]}
                        {...(miniMapLeftHandleResponder ? miniMapLeftHandleResponder.panHandlers : {})}
                      >
                        <View style={[styles.miniMapHandleGrip, { backgroundColor: colors.accent }]} />
                      </View>
                      <View
                        style={[
                          styles.miniMapHandle,
                          styles.miniMapHandleRight,
                          { borderColor: colors.accent, backgroundColor: colors.card },
                        ]}
                        {...(miniMapRightHandleResponder ? miniMapRightHandleResponder.panHandlers : {})}
                      >
                        <View style={[styles.miniMapHandleGrip, { backgroundColor: colors.accent }]} />
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
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
  header: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  resetButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resetButtonText: { fontSize: 12, fontWeight: '600' },
  chartWrapper: { position: 'relative' },
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
  miniMapContainer: { marginTop: 12, position: 'relative' },
  miniMapChartWrapper: { borderRadius: 12, overflow: 'hidden' },
  miniMapChart: { borderRadius: 12 },
  miniMapSelectionLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  miniMapShade: { position: 'absolute', top: 0, bottom: 0 },
  miniMapSelection: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: 'center',
  },
  miniMapHandle: {
    position: 'absolute',
    top: -4,
    bottom: -4,
    width: 20,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniMapHandleLeft: { left: -10 },
  miniMapHandleRight: { right: -10 },
  miniMapHandleGrip: { width: 3, height: 24, borderRadius: 2 },
});