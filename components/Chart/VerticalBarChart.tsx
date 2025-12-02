import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryGroup,
  VictoryLabel,
} from 'victory-native';
import Svg from 'react-native-svg';
import { getLineColor } from '@/utils/linePalette';

type SeriesValue = {
  id: number;
  label: string;
  value: number | null | undefined;
  colorIndex?: number;
};

type Series = {
  label: string; // es. "3M", "6M"
  values: SeriesValue[];
  min: number;
  max: number;
  format?: (value: unknown) => string;
};

type LegendItem = {
  id: number;
  label: string;
  colorIndex: number;
  hidden?: boolean;
};

type Props = {
  series: Series[];
  title?: string;
  colors: {
    text: string;
    secondaryText: string;
    border: string;
    background: string;
  };
  legend?: LegendItem[];
  onToggleLegend?: (id: number) => void;
  hiddenIds?: Set<number>;
  formatValue?: (value: unknown, seriesLabel?: string) => string;
};

const TRACK_HEIGHT = 260;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const VerticalBarChart: React.FC<Props> = ({
  series,
  title,
  colors,
  legend,
  onToggleLegend,
  hiddenIds,
  formatValue,
}) => {
  const categories = useMemo(() => series.map((s) => s.label), [series]);

  // costruisco dataset per ticker: una barra per categoria (periodo)
  const datasets = useMemo(() => {
    const map = new Map<
      number,
      { label: string; colorIndex: number; data: Array<{ x: string; y: number; raw: unknown; fmt?: Series['format'] }> }
    >();

    series.forEach((s, sIdx) => {
      const entries = s.values.filter((v) => !hiddenIds?.has(v.id));
      entries.forEach((v, idx) => {
        const colorIdx = v.colorIndex ?? idx ?? sIdx;
        if (!map.has(v.id)) {
          map.set(v.id, { label: v.label, colorIndex: colorIdx, data: [] });
        }
        const ds = map.get(v.id)!;
        ds.data.push({
          x: s.label,
          y: Number.isFinite(Number(v.value)) ? Number(v.value) : 0,
          raw: v.value,
          fmt: s.format,
        });
      });
    });

    return Array.from(map.values());
  }, [series, hiddenIds]);

  // min/max globali per dominio Y
  const { domainMin, domainMax } = useMemo(() => {
    const nums: number[] = [];
    datasets.forEach((ds) => {
      ds.data.forEach((d) => {
        if (Number.isFinite(d.y)) nums.push(d.y);
      });
    });
    if (!nums.length) return { domainMin: 0, domainMax: 1 };
    let min = Math.min(...nums);
    let max = Math.max(...nums);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const span = max - min || 1;
    const pad = span * 0.08;
    return { domainMin: min - pad, domainMax: max + pad };
  }, [datasets]);

  const domainSpan = domainMax - domainMin || 1;
  const hasZero = domainMin <= 0 && domainMax >= 0;
  const zeroUnit = hasZero ? clamp01((0 - domainMin) / domainSpan) : null;

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(screenWidth * 0.9, categories.length * 120);
  const barCount = Math.max(1, datasets.length);
  const barWidth = Math.max(10, Math.min(18, (chartWidth / categories.length) / (barCount * 2)));
  const groupOffset = barWidth * 1.2; // tighter grouping
  const labelDx = 0; // base dx; actual offset handled per-datum below
  const chartPadding = { top: 24, bottom: 46, left: 46, right: 20 };
  const domainPadding = { x: Math.max(20, barWidth * 4), y: 0 }; // keep bars clear of the y-axis line

  const formatter = (raw: unknown, fmt?: Series['format'], seriesLabel?: string) => {
    if (typeof fmt === 'function') return fmt(raw);
    if (formatValue) return formatValue(raw, seriesLabel);
    if (raw == null) return 'N/A';
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw.toFixed(2);
    return String(raw);
  };

  if (!series.length) return null;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.background }]}>
      {title ? (
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.chartScroll}>
        <Svg width={chartWidth} height={TRACK_HEIGHT + 20}>
          <VictoryChart
            standalone={false}
            height={TRACK_HEIGHT}
            width={chartWidth}
            domain={{ y: [domainMin, domainMax] }}
            padding={chartPadding}
            domainPadding={domainPadding}
            categories={{ x: categories }}
            prependDefaultAxes={false}
          >
            <VictoryAxis
              orientation="bottom"
              crossAxis={false} // place x-axis at bottom instead of at y=0
              offsetY={0}
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.secondaryText, fontSize: 10, padding: 6 },
                grid: { stroke: 'transparent' },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(t) => `${(t * 100).toFixed(1)}%`}
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.secondaryText, fontSize: 10, padding: 4 },
                grid: { stroke: colors.border, strokeWidth: StyleSheet.hairlineWidth },
              }}
            />
            <VictoryGroup offset={groupOffset}>
              {datasets.map((ds, dsIdx) => (
                <VictoryBar
                  key={ds.label ?? dsIdx}
                  data={ds.data}
                  barWidth={barWidth}
                  style={{
                    data: { fill: getLineColor(ds.colorIndex), opacity: 0.82 },
                    labels: { fill: getLineColor(ds.colorIndex), fontSize: 10, fontWeight: '700' },
                  }}
                  labels={({ datum }) => formatter(datum.raw ?? datum.y, datum.fmt, String(datum.x))}
                  labelComponent={
                    <VictoryLabel
                      angle={-90}
                      dx={({ datum }) => (Number(datum.y) >= 0 ? 18 : -18)}
                      dy={0}
                      textAnchor="middle"
                      verticalAnchor="middle"
                    />
                  }
                />
              ))}
            </VictoryGroup>
          </VictoryChart>
        </Svg>
      </ScrollView>

      {legend && legend.length > 0 && (
        <View style={styles.legend}>
          {legend.map((item) => {
            const color = getLineColor(item.colorIndex);
            const hidden = hiddenIds?.has(item.id);
            return (
              <View key={item.id} style={[styles.legendItem, hidden && { opacity: 0.5 }]}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text
                  onPress={() => onToggleLegend?.(item.id)}
                  style={[styles.legendText, { color: hidden ? colors.secondaryText : colors.text }]}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  chartScroll: {
    paddingBottom: 6,
  },
  legend: {
    flexDirection: 'column',
    rowGap: 8,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
});

export default VerticalBarChart;
