import React, { useCallback, useEffect, useState, useRef } from 'react';
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
        strategia: strategia || 'baseline',
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

  // Render a simple table for portfolios with consistent cell styling
  const renderPortfolioTable = (items: any[]) => {
    if (!items || items.length === 0) return null;

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
    const headers = ['ID_Portafoglio', 'Descrizione_Portafoglio'];
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
            <View style={[styles.cell, styles.firstCell]}>
              <Text style={styles.cellText}>{row.ID_Portafoglio}</Text>
            </View>

            <View style={[styles.cell, { minWidth: 220 }]}> {/* description gets a bit more space */}
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
              <ScrollView horizontal style={{ backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <View style={{ padding: 8 }}>
                  {/* Build table header based on max number of tickers */}
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
});

