from pathlib import Path
path = Path('app/(tabs)/index.tsx')
text = path.read_text()
start = text.find('comparisonRows.length')
end = text.find('/* pipeline', start)
if start == -1 or end == -1:
    raise SystemExit('marker missing')

new_block = """              {comparisonRows.length > 0 && selectedArray.length > 0 && (
                <View style={[styles.comparisonTableCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Text style={[styles.comparisonTitle, { color: colors.text }]}>
                    Snapshot comparison
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View>
                      <View style={styles.comparisonHeaderRow}>
                        <Text style={[styles.comparisonHeaderCell, { color: colors.secondaryText }]}>Metric</Text>
                        {selectedArray.map((t) => (
                          <Text
                            key={t.ticker_id}
                            style={[styles.comparisonHeaderCell, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {t.symbol || t.name}
                          </Text>
                        ))}
                      </View>
                      {comparisonRows.map(({ metric, values, min, max }) => (
                        <View key={metric.key} style={styles.comparisonRow}>
                          <Text style={[styles.comparisonMetricCell, { color: colors.secondaryText }]} numberOfLines={1}>
                            {metric.label}
                          </Text>
                          {values.map((v, idx) => (
                            <Text
                              key={`${metric.key}_${idx}`}
                              style={[
                                styles.comparisonValueCell,
                                { color: colorForValue(v, metric, min, max) },
                              ]}
                              numberOfLines={1}
                            >
                              {formatMetricValue(v, metric)}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
              {selectedArray.length > 0 && (
                <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <View style={[styles.cardHeaderRow, { marginBottom: 8 }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Metric bars</Text>
                  </View>

                  {barMetricCategories.map((cat) => {
                    const selectedKeys = barSelections[cat.id] ?? [];
                    const options = cat.metrics
                      .map((k) => barMetricOptionsByKey.get(k))
                      .filter(Boolean) as MetricOption[];
                    const series = buildBarSeries(selectedKeys);
                    const total = cat.metrics.length;
                    const allSelected = total > 0 && selectedKeys.length === total;

                    return (
                      <View key={cat.id} style={[styles.barChartCard, { borderColor: colors.border }]}>
                        <View style={styles.barChartHeader}>
                          <Text style={[styles.cardTitle, { color: colors.text }]}>
                            {cat.label}
                          </Text>
                          <View style={styles.inlineHelpRow}>
                            <Text style={[styles.metricCategoryCount, { color: colors.secondaryText }]}>
                              {selectedKeys.length}/{total} selected
                            </Text>
                            <Pressable
                              onPress={() => resetBarCategory(cat.id)}
                              style={[styles.bulkBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                            >
                              <Text style={[styles.bulkBtnText, { color: colors.text }]}>Reset</Text>
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.barChartControls}>
                          <View style={[styles.metricCategoryChips, { marginBottom: 10 }]}>
                            <Pressable
                              onPress={() => toggleBarCategory(cat.id)}
                              style={[
                                styles.metricCategoryToggle,
                                { borderColor: colors.border, backgroundColor: colors.card },
                                allSelected && { backgroundColor: friendlyAccent(colors.accent, 0.16), borderColor: colors.accent },
                              ]}
                            >
                              <Text style={[styles.metricCategoryToggleText, { color: allSelected ? colors.accent : colors.text }]}>
                                {allSelected ? 'Clear all' : 'Select all'}
                              </Text>
                            </Pressable>
                          </View>
                          <View style={styles.metricCategoryChips}>
                            {options.map((opt) => {
                              const active = selectedKeys.includes(opt.key as MetricKey);
                              return (
                                <Pressable
                                  key={opt.key}
                                  onPress={() => toggleBarMetric(cat.id, opt.key as MetricKey)}
                                  style={[
                                    styles.metricChip,
                                    { borderColor: colors.border, backgroundColor: colors.card },
                                    active && { backgroundColor: friendlyAccent(colors.accent, 0.2), borderColor: colors.accent },
                                  ]}
                                >
                                  <Text style={[styles.metricChipText, { color: active ? colors.accent : colors.text }]}>
                                    {opt.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>

                        {series.length > 0 ? (
                          <VerticalBarChart
                            series={series.map(({ metric, values, min, max }) => ({
                              label: getShortLabel(metric),
                              values,
                              min,
                              max,
                              format: (v: unknown) => {
                                const num = Number(v);
                                if (!Number.isFinite(num)) return '??"';
                                return `${(num * 100).toFixed(1)}%`;
                              },
                            }))}
                            title={undefined}
                            colors={{
                              text: colors.text,
                              secondaryText: colors.secondaryText,
                              border: colors.border,
                              background: colors.background,
                            }}
                            legend={selectedArray.map((t) => ({
                              label: t.name || t.symbol || String(t.ticker_id),
                              colorIndex: selectedIndexById.get(t.ticker_id) ?? 0,
                              id: t.ticker_id,
                              hidden: hiddenBars.has(t.ticker_id),
                            }))}
                            hiddenIds={hiddenBars}
                            onToggleLegend={toggleBarVisibility}
                          />
                        ) : (
                          <Text style={{ color: colors.secondaryText, marginTop: 8 }}>
                            Select at least one metric in this category to render the chart.
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
"""

text = text[:start] + new_block + text[end:]
path.write_text(text)
