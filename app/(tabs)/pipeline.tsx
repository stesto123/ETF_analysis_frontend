import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '@/services/api';
import ETFLineChart from '@/components/Chart/LineChart';
import { ChartDataPoint } from '@/types';

export default function PipelineScreen() {
  const insets = useSafeAreaInsets();

  const [idPortafoglio, setIdPortafoglio] = useState<string>('1');
  const [ammontare, setAmmontare] = useState<string>('10000');
  const [strategia, setStrategia] = useState<string>('baseline');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const defaultEnd = `${yyyy}${mm}${dd}`;
  const defaultStart = `${yyyy}0101`;

  const [dataInizio, setDataInizio] = useState<string>(defaultStart);
  const [dataFine, setDataFine] = useState<string>(defaultEnd);

  const [starting, setStarting] = useState(false);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedPortfolios, setSelectedPortfolios] = useState<Record<number, boolean>>({});
  const [portfolioResults, setPortfolioResults] = useState<Record<number, { calendar_id: number; valore_totale: number }[]>>({});
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  // Date range filter for graph (YYYYMMDD strings). Empty => no filter.
  const [chartStartDate, setChartStartDate] = useState<string>('');
  const [chartEndDate, setChartEndDate] = useState<string>('');
  const [tableError, setTableError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pid, setPid] = useState<number | null>(null);
  const [logPath, setLogPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<{ cancelled: boolean } | null>(null);

  const startPipeline = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const payload = {
        id_portafoglio: Number(idPortafoglio),
        ammontare: Number(ammontare),
        strategia: strategia || 'PAC Semplice',
        data_inizio: dataInizio,
        data_fine: dataFine,
      };
      const res = await apiService.runPipeline(payload as any);
      setJobId(res.job_id);
      setStatus(res.status ?? null);
      setPid(res.pid ?? null);
      setLogPath(res.log_path ?? null);

      // start polling
      if (pollingRef.current) pollingRef.current.cancelled = true;
      pollingRef.current = { cancelled: false };
      const poll = async () => {
        if (!res.job_id) return;
        try {
          const info = await apiService.getJobStatus(res.job_id);
          if (pollingRef.current?.cancelled) return;
          setStatus(info.status ?? null);
          if (info.status === 'running') setTimeout(poll, 3000);
        } catch (e) {
          if (!pollingRef.current?.cancelled) setError(e instanceof Error ? e.message : String(e));
        }
      };
      poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }, [idPortafoglio, ammontare, strategia, dataInizio, dataFine]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) pollingRef.current.cancelled = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await apiService.getPortfolioComposition();
        if (!mounted) return;
        setPortfolios(data);
      } catch (e) {
        if (!mounted) return;
        setTableError(e instanceof Error ? e.message : String(e));
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Toggle selection of portfolio row
  const togglePortfolio = (id: number) => {
    setSelectedPortfolios(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Fetch results for selected portfolios
  useEffect(() => {
    const ids = Object.keys(selectedPortfolios).filter(k => selectedPortfolios[Number(k)]).map(Number);
    if (ids.length === 0) return;
    let cancelled = false;
    setResultsLoading(true);
    setResultsError(null);
    (async () => {
      try {
        const entries: [number, any[]][] = await Promise.all(
          ids.map(async pid => {
            const rows = await apiService.getPortfolioResults(pid, true);
            return [pid, rows] as [number, any[]];
          })
        );
        if (cancelled) return;
        const mapped: Record<number, { calendar_id: number; valore_totale: number }[]> = {};
        entries.forEach(([pid, rows]) => {
          mapped[pid] = rows.map(r => ({ calendar_id: r.calendar_id, valore_totale: r.valore_totale }));
        });
        setPortfolioResults(prev => ({ ...prev, ...mapped }));
      } catch (e) {
        if (!cancelled) setResultsError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setResultsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedPortfolios]);

  // Build multi datasets for chart (align by date order - assume calendar_id descending from API -> reverse)
  const portfolioDatasets = useMemo(() => {
    const ids = Object.keys(selectedPortfolios).filter(k => selectedPortfolios[Number(k)]).map(Number);
    if (ids.length === 0) return null;
    const startInt = chartStartDate.length === 8 ? parseInt(chartStartDate, 10) : null;
    const endInt = chartEndDate.length === 8 ? parseInt(chartEndDate, 10) : null;
    const datasets = ids.map(pid => {
      const rows = (portfolioResults[pid] || []).slice().sort((a,b)=>a.calendar_id - b.calendar_id);
      const filtered = rows.filter(r => {
        if (startInt && r.calendar_id < startInt) return false;
        if (endInt && r.calendar_id > endInt) return false;
        return true;
      });
      const data = filtered.map(r => r.valore_totale);
      // labels as YYYY-MM-DD
      const labels = filtered.map(r => {
        const s = String(r.calendar_id);
        if (s.length === 8) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
        return s;
      });
      return { label: `P${pid}`, data, labels, colorHint: data.length && data[data.length-1] >= data[0] ? 'up' : 'down' as const };
    }).filter(ds => ds.data.length > 0);
    return datasets.length ? datasets : null;
  }, [portfolioResults, selectedPortfolios, chartStartDate, chartEndDate]);

  // Render a simple table for portfolios with consistent cell styling
  const renderPortfolioTable = (items: any[]) => {
  if (!items || items.length === 0) return <></>; // empty fragment instead of null to avoid accidental string coercion

    // determine max number of ticker columns across all portfolios
    let maxTickers = 0;
    const parsed = items.map((it) => {
      const pairs: { ticker?: string; percentuale?: number }[] = [];
      Object.keys(it).forEach((k) => {
        const m = k.match(/^ticker_(\d+)$/);
        if (m) {
          const idx = m[1];
          const ticker = it[k];
          const pctKey = `percentuale_${idx}`;
          pairs[Number(idx) - 1] = { ticker, percentuale: it[pctKey] };
        }
      });
      if (pairs.length > maxTickers) maxTickers = pairs.length;
      return { ID_Portafoglio: it.ID_Portafoglio, Descrizione_Portafoglio: it.Descrizione_Portafoglio, pairs };
    });

    // header
  const headers = ['Sel', 'ID_Portafoglio', 'Descrizione_Portafoglio'];
    for (let i = 1; i <= maxTickers; i++) {
      headers.push(`ticker ${i}`);
      headers.push(`percentuale ${i}`);
    }

    return (
      <View style={styles.tableContainer}>
        <View style={styles.tableHeaderRow}>
          {headers.map((h, idx) => (
            <View key={h + idx} style={[styles.headerCell, idx === headers.length - 1 && styles.lastCell]}>
              <Text style={styles.headerText}>{h}</Text>
            </View>
          ))}
        </View>

    {parsed.map((row) => (
          <View key={row.ID_Portafoglio} style={styles.tableRow}>
            <View style={[styles.cell, styles.firstCell, {alignItems:'center'}]}>
              <Pressable onPress={() => togglePortfolio(row.ID_Portafoglio)} style={[styles.checkbox, selectedPortfolios[row.ID_Portafoglio] && styles.checkboxOn]}>
                <Text style={styles.checkboxMark}>{selectedPortfolios[row.ID_Portafoglio] ? '✓' : ''}</Text>
              </Pressable>
            </View>
            <View style={[styles.cell, styles.firstCell]}>
              <Text style={styles.cellText}>{row.ID_Portafoglio}</Text>
            </View>
      {/* description gets a bit more space */}
      <View style={[styles.cell, { minWidth: 220 }]}> 
              <Text style={styles.cellText}>{row.Descrizione_Portafoglio}</Text>
            </View>

            {Array.from({ length: maxTickers }).map((_, i) => {
              const pair = row.pairs[i] || {};
              const isLast = i === maxTickers - 1;
              return (
                <React.Fragment key={i}>
                  <View style={[styles.cell, isLast && styles.lastCell]}>
                    <Text style={styles.cellText}>{pair.ticker ?? ''}</Text>
                  </View>
                  <View style={[styles.cell, isLast && styles.lastCell]}>
                    <Text style={styles.cellText}>{pair.percentuale != null ? String(pair.percentuale) : ''}</Text>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(24, insets.bottom + 12) }}>
          <Text style={styles.title}>Avvia Pipeline</Text>

          {/* Portfolio table inserted before pipeline form */}
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.label, { marginBottom: 8 }]}>Composizione Portafogli</Text>
            {tableError && <Text style={styles.error}>{tableError}</Text>}
            {portfolios.length === 0 && !tableError ? (
              <Text style={styles.small}>Nessun portafoglio disponibile</Text>
            ) : (
              <ScrollView
                horizontal
                style={{ backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}
                contentContainerStyle={{}}
              >
                <View style={{ padding: 8 }}>
                  {renderPortfolioTable(portfolios)}
                </View>
              </ScrollView>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>ID Portafoglio</Text>
            <TextInput style={styles.input} value={idPortafoglio} onChangeText={setIdPortafoglio} keyboardType="number-pad" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Ammontare</Text>
            <TextInput style={styles.input} value={ammontare} onChangeText={setAmmontare} keyboardType="numeric" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Strategia</Text>
            <TextInput style={styles.input} value={strategia} onChangeText={setStrategia} />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Data Inizio (YYYYMMDD)</Text>
              <TextInput style={styles.input} value={dataInizio} onChangeText={setDataInizio} keyboardType="number-pad" />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Data Fine (YYYYMMDD)</Text>
              <TextInput style={styles.input} value={dataFine} onChangeText={setDataFine} keyboardType="number-pad" />
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.btn, starting && { opacity: 0.6 }]} onPress={startPipeline} disabled={starting}>
            <Text style={styles.btnText}>{starting ? 'Avvio in corso...' : 'Avvia Pipeline'}</Text>
          </Pressable>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Stato Job</Text>
            <Text style={styles.statusValue}>{status ?? 'Nessun job avviato'}</Text>
            {jobId && <Text style={styles.small}>Job ID: {jobId}</Text>}
            {pid != null && <Text style={styles.small}>PID: {pid}</Text>}
            {logPath && <Text style={styles.small}>Log: {logPath}</Text>}
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={styles.label}>Andamento Valore Totale Portafogli Selezionati</Text>
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1, marginRight: 8 }]}> 
                <Text style={styles.label}>Start (YYYYMMDD)</Text>
                <TextInput
                  style={styles.input}
                  value={chartStartDate}
                  onChangeText={setChartStartDate}
                  placeholder="es. 20240101"
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}> 
                <Text style={styles.label}>End (YYYYMMDD)</Text>
                <TextInput
                  style={styles.input}
                  value={chartEndDate}
                  onChangeText={setChartEndDate}
                  placeholder="es. 20241231"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            {(chartStartDate || chartEndDate) && (
              <Text style={styles.small}>Filtro attivo {chartStartDate && `da ${chartStartDate}`} {chartEndDate && `a ${chartEndDate}`}</Text>
            )}
            {resultsError && <Text style={styles.error}>{resultsError}</Text>}
            {resultsLoading && !portfolioDatasets && <Text style={styles.small}>Caricamento risultati…</Text>}
            {!resultsLoading && (!portfolioDatasets || portfolioDatasets.length === 0) && (
              <Text style={styles.small}>Seleziona uno o più portafogli dalla tabella sopra.</Text>
            )}
            {portfolioDatasets && portfolioDatasets.length > 0 && (
              <View style={styles.chartCard}>
                <ETFLineChart
                  multi={portfolioDatasets.map(ds => ({ label: ds.label, data: ds.data, labels: ds.labels, colorHint: ds.colorHint as 'up' | 'down' }))}
                  data={[] as unknown as ChartDataPoint[]}
                  ticker="Portafogli"
                  height={220}
                />
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 12 },
  field: { marginBottom: 10 },
  label: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: { flexDirection: 'row' },
  btn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#FFF', fontWeight: '700' },
  statusCard: { marginTop: 16, backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  statusLabel: { fontSize: 12, color: '#6B7280' },
  statusValue: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 6 },
  small: { fontSize: 12, color: '#374151', marginTop: 6 },
  error: { color: '#DC2626', marginBottom: 8 },
  // table styles
  tableContainer: { backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#F3F4F6' },
  headerCell: { minWidth: 120, paddingVertical: 8, paddingHorizontal: 10, borderRightWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center' },
  firstCell: { minWidth: 120 },
  cell: { minWidth: 120, paddingVertical: 8, paddingHorizontal: 10, borderRightWidth: 1, borderColor: '#F3F4F6', justifyContent: 'center' },
  lastCell: { borderRightWidth: 0 },
  headerText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  cellText: { fontSize: 13, color: '#374151' },
  // checkbox styles reused from index screen
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  checkboxOn: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  checkboxMark: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});

