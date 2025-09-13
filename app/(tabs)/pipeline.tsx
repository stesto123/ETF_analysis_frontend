import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '@/services/api';
import { Picker } from '@react-native-picker/picker';
import ETFLineChart from '@/components/Chart/LineChart';
import { useTheme } from '@/components/common/ThemeProvider';
import Toast, { ToastType } from '@/components/common/Toast';
import { ChartDataPoint } from '@/types';

export default function PipelineScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [idPortafoglio, setIdPortafoglio] = useState<string>('1');
  const [ammontare, setAmmontare] = useState<string>('10000');
  const [strategia, setStrategia] = useState<string>('PAC Semplice');
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
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const pollingRef = useRef<{ cancelled: boolean } | null>(null);

  // ----- New: Create Portfolio & Composition -----
  const [newDescrizione, setNewDescrizione] = useState<string>('');
  const uidRef = useRef(1);
  const genKey = () => `row-${uidRef.current++}`;
  const [compItems, setCompItems] = useState<Array<{ key: string; areaId?: number; ID_ticker?: number; ticker?: string; percentuale?: number }>>([
    { key: `row-${uidRef.current++}` },
  ]);
  const [areas, setAreas] = useState<Array<{ area_geografica: string; id_area_geografica: number }>>([]);
  // Global selected area is just a default for NEW rows; each row keeps its own areaId
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [areaTickersMap, setAreaTickersMap] = useState<Record<number, Array<{ ID_ticker: number; ticker: string; nome: string }>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiService.getGeographicAreas(true).then(setAreas).catch(() => setAreas([]));
  }, []);

  useEffect(() => {
    if (selectedArea == null) return;
    if (areaTickersMap[selectedArea]) return;
    apiService.getTickersByArea(selectedArea, true, true)
      .then(list => setAreaTickersMap(prev => ({ ...prev, [selectedArea]: list })))
      .catch(() => {});
  }, [selectedArea, areaTickersMap]);

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

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

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

  const addCompRow = () => {
    setCompItems((prev) => [
      ...prev,
      { key: genKey(), areaId: selectedArea ?? undefined },
    ]);
  };
  const removeCompRow = (key: string) => {
    setCompItems((prev) => prev.filter((r) => r.key !== key));
  };
  const updateCompRow = (key: string, patch: Partial<{ areaId: number; ID_ticker: number; ticker: string; percentuale: number }>) => {
    setCompItems((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const totalPercent = useMemo(() => compItems.reduce((sum, r) => sum + (Number(r.percentuale) || 0), 0), [compItems]);

  const createPortfolioAndSave = async () => {
    setTableError(null);
    if (!newDescrizione.trim()) { setTableError('Inserisci una descrizione per il portafoglio'); return; }
    if (!compItems.length) { setTableError('Aggiungi almeno una riga di composizione'); return; }
    if (Math.abs(totalPercent - 100) > 0.01) { setTableError('La somma delle percentuali deve essere 100'); return; }
    // Build payload matching backend: { descrizione_portafoglio, composizione: [{ ID_ticker|ticker, percentuale }] }
    const composizione = compItems
      .map((r) => ({ ID_ticker: r.ID_ticker, percentuale: r.percentuale }))
      .filter((r) => (typeof r.ID_ticker === 'number' || typeof (r as any).ticker === 'string') && r.percentuale != null)
      .map((r) => ({ ID_ticker: r.ID_ticker, percentuale: String(Number(r.percentuale)) }));
    if (!composizione.length) { setTableError('Seleziona ticker e percentuali valide'); return; }
    setSaving(true);
    try {
      await apiService.savePortfolioWithComposition({
        descrizione_portafoglio: newDescrizione.trim(),
        composizione,
      });
  setNewDescrizione('');
  setCompItems([{ key: genKey() }]);
      // refresh portfolios table
      const data = await apiService.getPortfolioComposition();
      setPortfolios(data);
      setToast({ type: 'success', message: 'Portafoglio creato e composizione salvata.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setTableError(msg);
      setToast({ type: 'error', message: `Errore salvataggio: ${msg}` });
    } finally {
      setSaving(false);
    }
  };

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
      <View style={[styles.tableContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.tableHeaderRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {headers.map((h, idx) => (
            <View key={h + idx} style={[styles.headerCell, { borderColor: colors.border }, idx === headers.length - 1 && styles.lastCell]}>
              <Text style={[styles.headerText, { color: colors.text }]}>{h}</Text>
            </View>
          ))}
        </View>

    {parsed.map((row) => (
          <Swipeable
            key={row.ID_Portafoglio}
            renderLeftActions={() => (
              <Pressable
                onPress={async () => {
                  try {
                    await apiService.deletePortfolio(row.ID_Portafoglio);
                    const data = await apiService.getPortfolioComposition();
                    setPortfolios(data);
                    setToast({ type: 'success', message: `Portafoglio ${row.ID_Portafoglio} eliminato.` });
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    setToast({ type: 'error', message: `Errore eliminazione: ${msg}` });
                  }
                }}
                style={[styles.deleteAction, styles.deleteActionLeft]}
              >
                <Text style={styles.deleteActionText}>Elimina</Text>
              </Pressable>
            )}
          >
          <View style={[styles.tableRow, { borderColor: colors.border }]}>
            <View style={[styles.cell, styles.firstCell, { alignItems:'center', borderColor: colors.border }]}>
              <Pressable onPress={() => togglePortfolio(row.ID_Portafoglio)} style={[styles.checkbox, { borderColor: colors.border, backgroundColor: colors.card }, selectedPortfolios[row.ID_Portafoglio] && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                <Text style={styles.checkboxMark}>{selectedPortfolios[row.ID_Portafoglio] ? '✓' : ''}</Text>
              </Pressable>
            </View>
            <View style={[styles.cell, styles.firstCell, { borderColor: colors.border }]}>
              <Text style={[styles.cellText, { color: colors.text }]}>{row.ID_Portafoglio}</Text>
            </View>
      {/* description gets a bit more space */}
      <View style={[styles.cell, { minWidth: 220, borderColor: colors.border }]}> 
        <Text style={[styles.cellText, { color: colors.text }]}>{row.Descrizione_Portafoglio}</Text>
            </View>

            {Array.from({ length: maxTickers }).map((_, i) => {
              const pair = row.pairs[i] || {};
              const isLast = i === maxTickers - 1;
              return (
                <React.Fragment key={i}>
                  <View style={[styles.cell, { borderColor: colors.border }, isLast && styles.lastCell]}>
                    <Text style={[styles.cellText, { color: colors.secondaryText }]}>{pair.ticker ?? ''}</Text>
                  </View>
                  <View style={[styles.cell, { borderColor: colors.border }, isLast && styles.lastCell]}>
                    <Text style={[styles.cellText, { color: colors.secondaryText }]}>{pair.percentuale != null ? String(pair.percentuale) : ''}</Text>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
          </Swipeable>
        ))}
      </View>
    );
  };

  return (
  <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, zIndex: 20 }}>
          {toast && (
            <Toast
              type={toast.type}
              message={toast.message}
              onClose={() => setToast(null)}
            />
          )}
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(24, insets.bottom + 12), paddingTop: insets.top + 56 }}>
          <Text style={[styles.title, { color: colors.text }]}>Avvia Pipeline</Text>

          {/* Portfolio table inserted before pipeline form */}
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.label, { marginBottom: 8, color: colors.secondaryText }]}>Composizione Portafogli</Text>
            {tableError && <Text style={styles.error}>{tableError}</Text>}
            {portfolios.length === 0 && !tableError ? (
              <Text style={styles.small}>Nessun portafoglio disponibile</Text>
            ) : (
              <ScrollView
                horizontal
                style={{ backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                contentContainerStyle={{}}
              >
                <View style={{ padding: 8 }}>
                  {renderPortfolioTable(portfolios)}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Create new portfolio */}
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.title, { color: colors.text }]}>Crea Nuovo Portafoglio</Text>
            {tableError && <Text style={styles.error}>{tableError}</Text>}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Descrizione Portafoglio</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={newDescrizione} onChangeText={setNewDescrizione} placeholder="es. Portafoglio Misto" placeholderTextColor={colors.secondaryText} />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Area preferita (default per nuove righe)</Text>
              <View style={[styles.pickerWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Picker selectedValue={selectedArea} onValueChange={(v) => setSelectedArea(v)}>
                  <Picker.Item label="-- Seleziona area --" value={null as any} />
                  {areas.map((a) => (
                    <Picker.Item key={a.id_area_geografica} label={a.area_geografica} value={a.id_area_geografica} />
                  ))}
                </Picker>
              </View>
            </View>
            <Text style={[styles.label, { marginTop: 8, color: colors.secondaryText }]}>Composizione (deve sommare a 100)</Text>
            {compItems.map((row, idx) => (
              <View key={row.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                {/* Per-row Area */}
                <View style={[styles.pickerWrapper, { flex: 0.9, marginRight: 8, backgroundColor: colors.card, borderColor: colors.border }]}> 
                  <Picker
                    selectedValue={row.areaId ?? null}
                    onValueChange={(v) => {
                      const areaId = typeof v === 'number' ? v : undefined;
                      if (typeof areaId === 'number' && !areaTickersMap[areaId]) {
                        apiService.getTickersByArea(areaId, true, true).then(list => setAreaTickersMap(prev => ({ ...prev, [areaId]: list }))).catch(() => {});
                      }
                      // area change clears ticker in this row
                      updateCompRow(row.key, { areaId, ID_ticker: undefined, ticker: undefined });
                    }}
                  >
                    <Picker.Item label="Area" value={null as any} />
                    {areas.map((a) => (
                      <Picker.Item key={a.id_area_geografica} label={a.area_geografica} value={a.id_area_geografica} />
                    ))}
                  </Picker>
                </View>
                {/* Per-row Ticker from selected area */}
                <View style={[styles.pickerWrapper, { flex: 1.2, marginRight: 8, opacity: row.areaId ? 1 : 0.6, backgroundColor: colors.card, borderColor: colors.border }]}> 
                  <Picker
                    enabled={!!row.areaId}
                    selectedValue={row.ID_ticker ?? null}
                    onValueChange={(v) => {
                      const id = typeof v === 'number' ? v : undefined;
                      const list = row.areaId ? areaTickersMap[row.areaId] || [] : [];
                      const found = typeof id === 'number' ? list.find((t) => t.ID_ticker === id) : undefined;
                      updateCompRow(row.key, { ID_ticker: id, ticker: found?.ticker });
                    }}
                  >
                    <Picker.Item label="Ticker" value={null as any} />
                    {(row.areaId ? areaTickersMap[row.areaId] || [] : []).map((t) => (
                      <Picker.Item key={t.ID_ticker} label={`${t.nome || t.ticker} (${t.ticker})`} value={t.ID_ticker} />
                    ))}
                  </Picker>
                </View>
                <TextInput
                  style={[styles.input, { flex: 0.6, marginRight: 8, backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={row.percentuale != null ? String(row.percentuale) : ''}
                  onChangeText={(v) => updateCompRow(row.key, { percentuale: Number(v) })}
                  placeholder="%"
                  keyboardType="numeric"
                  placeholderTextColor={colors.secondaryText}
                />
                <Pressable onPress={() => removeCompRow(row.key)} style={[styles.checkbox, { width: 28, height: 28 }]}>
                  <Text style={styles.checkboxMark}>-</Text>
                </Pressable>
              </View>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Pressable onPress={addCompRow} style={[styles.checkbox, { width: 28, height: 28, marginRight: 8 }]}>
                <Text style={styles.checkboxMark}>+</Text>
              </Pressable>
              <Text style={styles.small}>Totale: {totalPercent.toFixed(1)}%</Text>
            </View>
            <Pressable style={[styles.btn, saving && { opacity: 0.7 }]} onPress={createPortfolioAndSave} disabled={saving}>
              <Text style={styles.btnText}>{saving ? 'Salvataggio…' : 'Crea e Salva Composizione'}</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>ID Portafoglio</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={idPortafoglio} onChangeText={setIdPortafoglio} keyboardType="number-pad" placeholderTextColor={colors.secondaryText} />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Ammontare</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={ammontare} onChangeText={setAmmontare} keyboardType="numeric" placeholderTextColor={colors.secondaryText} />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Strategia</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={strategia} onChangeText={setStrategia} placeholderTextColor={colors.secondaryText} />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Data Inizio (YYYYMMDD)</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={dataInizio} onChangeText={setDataInizio} keyboardType="number-pad" placeholderTextColor={colors.secondaryText} />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Data Fine (YYYYMMDD)</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={dataFine} onChangeText={setDataFine} keyboardType="number-pad" placeholderTextColor={colors.secondaryText} />
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.btn, starting && { opacity: 0.6 }]} onPress={startPipeline} disabled={starting}>
            <Text style={styles.btnText}>{starting ? 'Avvio in corso...' : 'Avvia Pipeline'}</Text>
          </Pressable>

          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statusLabel, { color: colors.secondaryText }]}>Stato Job</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>{status ?? 'Nessun job avviato'}</Text>
            {jobId && <Text style={[styles.small, { color: colors.secondaryText }]}>Job ID: {jobId}</Text>}
            {pid != null && <Text style={[styles.small, { color: colors.secondaryText }]}>PID: {pid}</Text>}
            {logPath && <Text style={[styles.small, { color: colors.secondaryText }]}>Log: {logPath}</Text>}
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Andamento Valore Totale Portafogli Selezionati</Text>
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1, marginRight: 8 }]}> 
                <Text style={[styles.label, { color: colors.secondaryText }]}>Start (YYYYMMDD)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={chartStartDate}
                  onChangeText={setChartStartDate}
                  placeholder="es. 20240101"
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}> 
                <Text style={[styles.label, { color: colors.secondaryText }]}>End (YYYYMMDD)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
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
            {resultsLoading && !portfolioDatasets && <Text style={[styles.small, { color: colors.secondaryText }]}>Caricamento risultati…</Text>}
            {!resultsLoading && (!portfolioDatasets || portfolioDatasets.length === 0) && (
              <Text style={[styles.small, { color: colors.secondaryText }]}>Seleziona uno o più portafogli dalla tabella sopra.</Text>
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
  pickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
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
  deleteAction: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 1,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  deleteActionLeft: { alignSelf: 'stretch' },
  deleteActionText: { color: '#FFF', fontWeight: '700' },
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

