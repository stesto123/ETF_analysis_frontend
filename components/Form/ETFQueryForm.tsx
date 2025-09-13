import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Calendar, TrendingUp } from 'lucide-react-native';
import { QueryParams } from '@/types';
import { formatDateForAPI, isValidDateRange } from '@/utils/dateHelpers';
import { useTheme } from '@/components/common/ThemeProvider';

interface Props {
  onSubmit: (params: QueryParams) => void;
  loading: boolean;
}

export default function ETFQueryForm({ onSubmit, loading }: Props) {
  const { colors } = useTheme();
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // iOS: modal + valori temporanei
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [tempStart, setTempStart] = useState<Date>(startDate);
  const [tempEnd, setTempEnd] = useState<Date>(endDate);

  const today = new Date();

  // ---------- ANDROID ----------
  const openAndroidStart = () => {
    DateTimePickerAndroid.open({
      value: startDate,
      mode: 'date',
      is24Hour: true,
      maximumDate: today,
      onChange: (_: DateTimePickerEvent, selected?: Date) => {
        if (!selected) return;
        // mantieni coerenza: se start > end, riallinea end
        if (selected > endDate) setEndDate(selected);
        setStartDate(selected);
      },
    });
  };

  const openAndroidEnd = () => {
    DateTimePickerAndroid.open({
      value: endDate,
      mode: 'date',
      is24Hour: true,
      minimumDate: startDate,
      maximumDate: today,
      onChange: (_: DateTimePickerEvent, selected?: Date) => {
        if (!selected) return;
        const picked = selected > today ? today : selected;
        if (picked < startDate) setStartDate(picked);
        setEndDate(picked);
      },
    });
  };

  // ---------- iOS ----------
  const openIOSStart = () => {
    setTempStart(startDate);
    setShowStartModal(true);
  };

  const openIOSEnd = () => {
    setTempEnd(endDate);
    setShowEndModal(true);
  };

  const confirmIOSStart = () => {
    const chosen = tempStart > today ? today : tempStart;
    if (chosen > endDate) setEndDate(chosen);
    setStartDate(chosen);
    setShowStartModal(false);
  };

  const confirmIOSEnd = () => {
    const chosen = tempEnd > today ? today : tempEnd;
    if (chosen < startDate) setStartDate(chosen);
    setEndDate(chosen);
    setShowEndModal(false);
  };

  const cancelIOS = () => {
    setShowStartModal(false);
    setShowEndModal(false);
  };

  // ---------- SUBMIT ----------
  const handleSubmit = () => {
    if (!isValidDateRange(startDate, endDate)) {
      // opzionale: puoi mostrare un alert se vuoi
      return;
    }
    const params: QueryParams = {
      id_ticker: -1, // ignorato a livello index
      start_date: formatDateForAPI(startDate),
      end_date: formatDateForAPI(endDate),
    };
    onSubmit(params);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }] }>
  <Text style={[styles.title, { color: colors.text }]}>ETF Data Query</Text>

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.secondaryText }]}>Start Date</Text>
          <TouchableOpacity
            style={[styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={Platform.OS === 'android' ? openAndroidStart : openIOSStart}
            activeOpacity={0.8}
          >
            <Calendar size={20} color={colors.secondaryText} />
            <Text style={[styles.dateText, { color: colors.text }]}>{startDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.secondaryText }]}>End Date</Text>
          <TouchableOpacity
            style={[styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={Platform.OS === 'android' ? openAndroidEnd : openIOSEnd}
            activeOpacity={0.8}
          >
            <Calendar size={20} color={colors.secondaryText} />
            <Text style={[styles.dateText, { color: colors.text }]}>{endDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submit, { backgroundColor: loading ? '#6B7280' : colors.accent }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <TrendingUp size={20} color="#fff" />
        <Text style={styles.submitText}>{loading ? 'Loading...' : 'Fetch Data'}</Text>
      </TouchableOpacity>

      <Text style={[styles.hint, { color: colors.secondaryText }] }>
        Seleziona un’area dalle pilloline sopra, scegli le date e premi Fetch.
      </Text>

      {/* --------- iOS MODALS --------- */}
      <Modal transparent visible={showStartModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }] }>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Seleziona Start Date</Text>
            <DateTimePicker
              value={tempStart}
              mode="date"
              display="inline"
              onChange={(e, d) => d && setTempStart(d)}
              maximumDate={today}
              style={styles.pickerInline}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={cancelIOS} style={[styles.actionBtn, styles.btnCancel, { backgroundColor: colors.background }]}>
                <Text style={[styles.btnTextCancel, { color: colors.text }]}>Annulla</Text>
              </Pressable>
              <Pressable onPress={confirmIOSStart} style={[styles.actionBtn, styles.btnOk, { backgroundColor: colors.accent }]}>
                <Text style={styles.btnTextOk}>Conferma</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showEndModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }] }>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Seleziona End Date</Text>
            <DateTimePicker
              value={tempEnd}
              mode="date"
              display="inline"
              onChange={(e, d) => d && setTempEnd(d)}
              minimumDate={tempStart} // coerente durante la scelta
              maximumDate={today}
              style={styles.pickerInline}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={cancelIOS} style={[styles.actionBtn, styles.btnCancel, { backgroundColor: colors.background }]}>
                <Text style={[styles.btnTextCancel, { color: colors.text }]}>Annulla</Text>
              </Pressable>
              <Pressable onPress={confirmIOSEnd} style={[styles.actionBtn, styles.btnOk, { backgroundColor: colors.accent }]}>
                <Text style={styles.btnTextOk}>Conferma</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginBottom: 20, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 12 },
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

  // iOS modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  pickerInline: { alignSelf: 'center' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnCancel: { backgroundColor: '#F3F4F6' },
  btnOk: { backgroundColor: '#3B82F6' },
  btnTextCancel: { color: '#111827', fontWeight: '600' },
  btnTextOk: { color: '#FFFFFF', fontWeight: '600' },
});