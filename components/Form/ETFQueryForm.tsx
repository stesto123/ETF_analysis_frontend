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

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginHorizontal: 0,
    marginTop: 0,
    padding: 0,
    borderWidth: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    columnGap: 14,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    columnGap: 10,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 12,
    marginBottom: 14,
  },
  presetChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 82,
    alignItems: 'center',
  },
  presetChipActive: {
    borderWidth: 0,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  presetChipPressed: {
    transform: [{ scale: 0.97 }],
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  presetHint: {
    fontSize: 11,
    marginTop: 2,
  },
  submit: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 10,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    marginTop: 14,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerInline: {
    alignSelf: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    columnGap: 12,
    marginTop: 8,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  btnCancel: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnOk: {
    backgroundColor: '#2563EB',
  },
  btnTextCancel: {
    fontWeight: '600',
  },
  btnTextOk: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

type QuickRangeKey = '1M' | '3M' | 'YTD' | '1Y';

const MS_IN_DAY = 86400000;
const addDays = (source: Date, amount: number) => new Date(source.getTime() + amount * MS_IN_DAY);
const startOfYear = (source: Date) => new Date(source.getFullYear(), 0, 1);

const resolveQuickRange = (key: QuickRangeKey, reference = new Date()) => {
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  let start: Date;
  switch (key) {
    case '3M':
      start = addDays(today, -90);
      break;
    case 'YTD':
      start = startOfYear(today);
      break;
    case '1Y':
      start = addDays(today, -365);
      break;
    case '1M':
    default:
      start = addDays(today, -30);
      break;
  }
  return { start, end: today };
};

const QUICK_RANGE_ORDER: QuickRangeKey[] = ['1M', '3M', 'YTD', '1Y'];
const QUICK_RANGE_DISPLAY: Record<QuickRangeKey, string> = {
  '1M': '1M',
  '3M': '3M',
  YTD: 'YTD',
  '1Y': '1Y',
};
const QUICK_RANGE_HINT: Record<QuickRangeKey, string> = {
  '1M': 'Last month',
  '3M': 'Last 3 months',
  YTD: 'Year to date',
  '1Y': 'Last year',
};
const DEFAULT_PRESET: QuickRangeKey = '1M';
const DEFAULT_PRESET_DATES = resolveQuickRange(DEFAULT_PRESET);

export default function ETFQueryForm({ onSubmit, loading }: Props) {
  const { colors } = useTheme();
  const [startDate, setStartDate] = useState<Date>(DEFAULT_PRESET_DATES.start);
  const [endDate, setEndDate] = useState<Date>(DEFAULT_PRESET_DATES.end);
  const [activePreset, setActivePreset] = useState<QuickRangeKey | null>(DEFAULT_PRESET);

  // iOS: modal + valori temporanei
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [tempStart, setTempStart] = useState<Date>(startDate);
  const [tempEnd, setTempEnd] = useState<Date>(endDate);

  const today = new Date();

  const applyPreset = (key: QuickRangeKey) => {
    const { start, end } = resolveQuickRange(key, new Date());
    if (end > today) {
      end.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
    }
    setStartDate(start);
    setEndDate(end);
    setTempStart(start);
    setTempEnd(end);
    setActivePreset(key);
  };

  // ---------- ANDROID ----------
  const openAndroidStart = () => {
    DateTimePickerAndroid.open({
      value: startDate,
      mode: 'date',
      is24Hour: true,
      maximumDate: today,
      onChange: (_: DateTimePickerEvent, selected?: Date) => {
        if (!selected) return;
        setActivePreset(null);
        const picked = new Date(selected.getTime());
        // mantieni coerenza: se start > end, riallinea end
        if (picked > endDate) {
          setEndDate(picked);
          setTempEnd(picked);
        }
        setStartDate(picked);
        setTempStart(picked);
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
        setActivePreset(null);
        const base = selected > today ? today : selected;
        const picked = new Date(base.getTime());
        if (picked < startDate) {
          setStartDate(picked);
          setTempStart(picked);
        }
        setEndDate(picked);
        setTempEnd(picked);
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
    setActivePreset(null);
    const chosen = tempStart > today ? today : tempStart;
    if (chosen > endDate) {
      setEndDate(chosen);
      setTempEnd(chosen);
    }
    setStartDate(chosen);
    setTempStart(chosen);
    setShowStartModal(false);
  };

  const confirmIOSEnd = () => {
    setActivePreset(null);
    const chosen = tempEnd > today ? today : tempEnd;
    if (chosen < startDate) {
      setStartDate(chosen);
      setTempStart(chosen);
    }
    setEndDate(chosen);
    setTempEnd(chosen);
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

      <View style={styles.presetRow}>
        {QUICK_RANGE_ORDER.map((key) => {
          const isActive = activePreset === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={QUICK_RANGE_HINT[key]}
              onPress={() => applyPreset(key)}
              style={({ pressed }) => [
                styles.presetChip,
                { borderColor: colors.border, backgroundColor: colors.background },
                isActive && [styles.presetChipActive, { backgroundColor: colors.accent }],
                pressed && styles.presetChipPressed,
              ]}
            >
              <Text style={[styles.presetLabel, { color: isActive ? '#FFFFFF' : colors.text }]}>
                {QUICK_RANGE_DISPLAY[key]}
              </Text>
              <Text style={[styles.presetHint, { color: isActive ? 'rgba(255,255,255,0.82)' : colors.secondaryText }]}>
                {QUICK_RANGE_HINT[key]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.submit, { backgroundColor: colors.accent, opacity: loading ? 0.65 : 1 }]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        <TrendingUp size={20} color="#fff" />
        <Text style={styles.submitText}>{loading ? 'Loading...' : 'Fetch Data'}</Text>
      </TouchableOpacity>

      <Text style={[styles.hint, { color: colors.secondaryText }] }>
        Pick an area with the chips above, choose the dates, and tap Fetch.
      </Text>

      {/* --------- iOS MODALS --------- */}
      <Modal transparent visible={showStartModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }] }>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Start Date</Text>
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
                <Text style={[styles.btnTextCancel, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmIOSStart} style={[styles.actionBtn, styles.btnOk, { backgroundColor: colors.accent }]}>
                <Text style={styles.btnTextOk}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showEndModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }] }>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select End Date</Text>
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
                <Text style={[styles.btnTextCancel, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmIOSEnd} style={[styles.actionBtn, styles.btnOk, { backgroundColor: colors.accent }]}>
                <Text style={styles.btnTextOk}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
