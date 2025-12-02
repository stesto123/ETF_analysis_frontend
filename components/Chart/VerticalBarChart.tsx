import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { getLineColor } from '@/utils/linePalette';

type SeriesValue = {
  id: number;
  label: string;
  value: number | null | undefined;
  colorIndex?: number;
};

type Series = {
  label: string;
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

const TRACK_HEIGHT = 200;
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
  if (!series || series.length === 0) return null;

  // 1. Filtra voci nascoste
  const groups = useMemo(
    () =>
      series.map((s) => ({
        ...s,
        entries: s.values.filter((v) => !hiddenIds?.has(v.id)),
      })),
    [series, hiddenIds]
  );

  // 2. Min / Max globali
  const { globalMin, globalMax } = useMemo(() => {
    const nums: number[] = [];
    groups.forEach((g) =>
      g.entries.forEach((v) => {
        const n = Number(v.value);
        if (Number.isFinite(n)) nums.push(n);
      })
    );

    if (nums.length === 0) return { globalMin: 0, globalMax: 1 };

    let min = Math.min(...nums);
    let max = Math.max(...nums);

    if (min === max) {
      min -= 1;
      max += 1;
    }

    return { globalMin: min, globalMax: max };
  }, [groups]);

  // 3. Dominio Y (includendo sempre 0)
  let domainMin = Math.min(globalMin, 0);
  let domainMax = Math.max(globalMax, 0);
  if (domainMin === domainMax) {
    domainMin -= 1;
    domainMax += 1;
  }
  const domainSpan = domainMax - domainMin;

  // Trasformazione valore → Y (pixel)
  //   domainMax -> 0 (alto)
  //   domainMin -> TRACK_HEIGHT (basso)
  const toY = (value: number) => {
    const t = clamp01((value - domainMin) / domainSpan); // 0=min, 1=max
    return (1 - t) * TRACK_HEIGHT; // invertito perché 0 in alto
  };

  const hasZero = domainMin <= 0 && domainMax >= 0;
  const zeroY = hasZero ? toY(0) : null;

  // Tick per l’asse Y (top, 0 se in range, bottom)
  const yTicks: number[] = [domainMax];
  if (hasZero) yTicks.push(0);
  yTicks.push(domainMin);

  return (
    <View
      style={[
        styles.card,
        { borderColor: colors.border, backgroundColor: colors.background },
      ]}
    >
      {title && (
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      )}

      <View style={{ flexDirection: 'row' }}>
        {/* Asse Y con stessa scala del grafico */}
        <View style={[styles.yAxisWrapper, { height: TRACK_HEIGHT }]}>
          <View style={styles.yAxisTrack}>
            {/* Linea verticale asse */}
            <View
              style={[
                styles.yAxisLine,
                { backgroundColor: colors.border },
              ]}
            />
            {/* Etichette in posizione assoluta, usando toY() */}
            {yTicks.map((val, idx) => {
              const y = toY(val);
              return (
                <View
                  key={`${val}-${idx}`}
                  style={[
                    styles.yAxisLabelContainer,
                    { top: y - 8 }, // -8 per centrare il testo
                  ]}
                >
                  <Text
                    style={[
                      styles.yAxisLabel,
                      { color: colors.text },
                    ]}
                  >
                    {val.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Area grafico scrollabile */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.chartContainer}
        >
          <View style={[styles.chartArea, { height: TRACK_HEIGHT }]}>
            {/* Linea dello zero, nera e spessa */}
            {hasZero && zeroY !== null && (
              <View
                style={[
                  styles.zeroLine,
                  {
                    top: zeroY,
                  },
                ]}
              />
            )}

            {groups.map((g) => {
              const entries = g.entries;
              const barCount = entries.length || 1;

              const barWidth = Math.max(10, Math.min(18, 56 / barCount));
              const gap = 8;
              const groupWidth = Math.max(
                barCount * barWidth + (barCount - 1) * gap,
                52
              );

              const formatter =
                g.format ??
                (formatValue
                  ? (v: unknown) => formatValue(v, g.label)
                  : (v: unknown) => String(v ?? 'N/A'));

              return (
                <View key={g.label} style={[styles.group, { width: groupWidth + 8 }]}>
                  <View style={[styles.groupBars, { height: TRACK_HEIGHT }]}>
                    {entries.map((val, idx) => {
                      const numeric = Number(val.value);
                      if (!Number.isFinite(numeric)) return null;

                      const valueY = toY(numeric);
                      const baselineY =
                        hasZero && zeroY !== null
                          ? zeroY
                          : numeric >= 0
                          ? toY(domainMin) // tutto positivo
                          : toY(domainMax); // tutto negativo

                      const top = Math.min(valueY, baselineY);
                      const bottom = Math.max(valueY, baselineY);
                      const barHeight = Math.max(2, bottom - top);

                      const color = getLineColor(val.colorIndex ?? idx);

                      return (
                        <View
                          key={`${g.label}-${val.id}-${idx}`}
                          style={{ alignItems: 'center', marginHorizontal: gap / 2 }}
                        >
                          <View
                            style={{
                              height: TRACK_HEIGHT,
                              width: barWidth,
                              position: 'relative',
                            }}
                          >
                            <View
                              style={[
                                styles.bar,
                                {
                                  position: 'absolute',
                                  top,
                                  width: barWidth,
                                  height: barHeight,
                                  backgroundColor: color,
                                  borderColor: color,
                                },
                              ]}
                            />
                          </View>

                          <Text style={[styles.barValue, { color: colors.text }]}>
                            {formatter(val.value)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <Text style={[styles.groupLabel, { color: colors.text }]}>
                    {g.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Legenda */}
      {legend && legend.length > 0 && (
        <View style={styles.legend}>
          {legend.map((item) => {
            const hidden = hiddenIds?.has(item.id);
            const color = getLineColor(item.colorIndex);

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
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  yAxisWrapper: {
    width: 60,
    marginRight: 6,
  },
  yAxisTrack: {
    flex: 1,
    position: 'relative',
  },
  yAxisLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth * 2,
    opacity: 0.6,
  },
  yAxisLabelContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  yAxisLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  chartContainer: {
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
  },
  zeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4, // linea spessa
    backgroundColor: '#000000', // nera
    zIndex: 5,
  },
  group: {
    alignItems: 'center',
    marginHorizontal: 6,
  },
  groupBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  barValue: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  groupLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  legend: {
    marginTop: 12,
    flexDirection: 'column',
    rowGap: 8,
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
  },
});

export default VerticalBarChart;
