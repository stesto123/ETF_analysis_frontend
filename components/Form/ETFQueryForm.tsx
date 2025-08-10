import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Calendar, TrendingUp } from 'lucide-react-native';
import { QueryParams } from '@/types';
import { formatDateForAPI, isValidDateRange } from '@/utils/dateHelpers';

interface Props {
  onSubmit: (params: QueryParams) => void;
  loading: boolean;
}

export default function ETFQueryForm({ onSubmit, loading }: Props) {
  const [startDate, setStartDate] = useState<Date>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState<Date>(new Date());

  const handleSubmit = () => {
    if (!isValidDateRange(startDate, endDate)) {
      Alert.alert(
        'Errore',
        'Seleziona un intervallo valido. La data finale non può essere nel futuro e deve essere successiva alla data iniziale.'
      );
      return;
    }
    // Placeholder: l’index ignora id_ticker e lancia più chiamate per tutti i ticker dell’area
    const params: QueryParams = {
      id_ticker: -1,
      start_date: formatDateForAPI(startDate),
      end_date: formatDateForAPI(endDate),
    };
    onSubmit(params);
  };

  const pickStart = () => {
    Alert.alert('Start Date', `Attuale: ${startDate.toLocaleDateString()}`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Ultima settimana', onPress: () => setStartDate(new Date(Date.now() - 7 * 86400000)) },
      { text: 'Ultimo mese', onPress: () => setStartDate(new Date(Date.now() - 30 * 86400000)) },
      { text: 'Ultimi 3 mesi', onPress: () => setStartDate(new Date(Date.now() - 90 * 86400000)) },
    ]);
  };

  const pickEnd = () => {
    Alert.alert('End Date', `Attuale: ${endDate.toLocaleDateString()}`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Oggi', onPress: () => setEndDate(new Date()) },
      { text: 'Ieri', onPress: () => setEndDate(new Date(Date.now() - 86400000)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ETF Data Query</Text>

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={pickStart}>
            <Calendar size={20} color="#6B7280" />
            <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.col}>
          <Text style={styles.label}>End Date</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={pickEnd}>
            <Calendar size={20} color="#6B7280" />
            <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submit, loading && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <TrendingUp size={20} color="#fff" />
        <Text style={styles.submitText}>{loading ? 'Loading...' : 'Fetch Data'}</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        Seleziona un’area con le pilloline sopra: verranno caricati tutti i ticker di quell’area.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginBottom: 20, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  col: { flex: 1 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, backgroundColor: '#F9FAFB',
  },
  dateText: { fontSize: 16, color: '#374151', marginLeft: 8 },
  submit: {
    backgroundColor: '#3B82F6', borderRadius: 8, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  submitDisabled: { backgroundColor: '#9CA3AF' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  hint: { marginTop: 12, fontSize: 12, color: '#6B7280', textAlign: 'center' },
});