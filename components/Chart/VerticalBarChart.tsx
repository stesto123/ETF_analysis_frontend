import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { getLineColor } from '@/utils/linePalette';

type Series = {
  label: string;
  values: Array<{ id: number; label: string; value: number | null | undefined; colorIndex?: number }>;
  min: number;
  max: number;
  format?: (value: unknown) => string;
  zeroBaseline?: boolean;
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
  legend?: Array<{ id: number; label: string; colorIndex: number; hidden?: boolean }>;
  onToggleLegend?: (id: number) => void;
  hiddenIds?: Set<number>;
  formatValue?: (value: unknown, seriesLabel?: string) => string;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const TRACK_HEIGHT = 140;

const VerticalBarChart: React.FC<Props> = ({ series, title, colors, legend, onToggleLegend, hiddenIds, formatValue }) => {
  if (!series.length) return null;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.background }]}>
      {title ? (
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.barChartContainer}>
        {series.map((s) => {
          const span = Number.isFinite(s.min) && Number.isFinite(s.max) && s.min !== s.max ? s.max - s.min : 1;
          const entries = s.values.filter((v) => !hiddenIds?.has(v.id));
          const hasRange = Number.isFinite(s.min) && Number.isFinite(s.max) && s.min !== s.max;
          const hasNegative = s.min < 0 && s.max > 0;
          const zeroRatio = hasRange ? clamp01((0 - s.min) / span) : 0;
          const showZeroLine = hasRange;
          return (
            <View key={s.label} style={styles.barColumnGroup}>
              <Text style={[styles.barColumnLabel, { color: colors.text }]} numberOfLines={1}>
                {s.label}
              </Text>
              <View style={[styles.barColumnChart, { borderColor: colors.border }]}>
                <View style={[styles.barColumnTrack, { backgroundColor: colors.background, height: TRACK_HEIGHT }]}>
                  {showZeroLine && (
                    <View style={[styles.barZeroLine, { backgroundColor: colors.border, top: `${(1 - zeroRatio) * 100}%` }]} />
                  )}
                  {entries.map((val, idx) => {
                    const numeric = Number(val.value);
                    if (!Number.isFinite(s.min) || !Number.isFinite(s.max) || s.min === s.max) {
                      return null;
                    }
                    const valueRatio = clamp01((numeric - s.min) / span);
                    const start = Math.min(zeroRatio, valueRatio);
                    const end = Math.max(zeroRatio, valueRatio);
                    const heightPx = Math.max(4, (end - start) * TRACK_HEIGHT);
                    const widthPerc = Math.max(30, 80 / Math.max(1, s.values.length));
                    const baseColor = getLineColor(val.colorIndex ?? idx);
                    return (
                      <View
                        key={`${s.label}_${val.id}_${idx}`}
                        style={[
                          styles.barColumnFill,
                          {
                            height: heightPx,
                            backgroundColor: baseColor,
                            opacity: 0.35,
                            width: `${widthPerc}%`,
                            left: `${(100 - widthPerc) / 2}%`,
                            transform: [{ translateY: (1 - Math.max(start, end)) * TRACK_HEIGHT }],
                            borderColor: baseColor,
                            borderWidth: StyleSheet.hairlineWidth,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
                <View style={styles.barColumnValues}>
                  {entries.map((val, idx) => (
                    <Text key={`${s.label}_${idx}_val`} style={[styles.barColumnValue, { color: getLineColor(val.colorIndex ?? idx) }]} numberOfLines={1}>
                      {typeof s.format === 'function'
                        ? s.format(val.value)
                        : formatValue
                        ? formatValue(val.value, s.label)
                        : String(val.value ?? '�?"')}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
      {legend && legend.length > 0 && (
        <View style={styles.barLegend}>
          {legend.map((item) => {
            const color = getLineColor(item.colorIndex);
            const hidden = hiddenIds?.has(item.id);
            return (
              <View
                key={item.id}
                style={[styles.legendItem, hidden && { opacity: 0.5 }]}
              >
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text
                  onPress={() => onToggleLegend?.(item.id)}
                  style={[
                    styles.legendText,
                    { color: hidden ? colors.secondaryText : colors.text },
                  ]}
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
  barChartContainer: {
    columnGap: -2,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  barColumnGroup: {
    minWidth: 80,
    alignItems: 'center',
  },
  barColumnLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  barColumnChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 0,
    paddingTop: 4,
  },
  barColumnTrack: {
    width: 28,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    justifyContent: 'flex-end',
    overflow: 'visible',
    position: 'relative',
  },
  barZeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth * 2,
    opacity: 0.6,
  },
  barColumnFill: {
    width: '100%',
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  barColumnValues: {
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: 2,
    marginTop: 4,
  },
  barColumnValue: {
    fontSize: 9,
    fontWeight: '700',
  },
  barLegend: {
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
