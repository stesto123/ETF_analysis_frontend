import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import { Calendar, TrendingUp } from 'lucide-react-native';
import { QueryParams } from '@/types';
import { formatDateForAPI, isValidDateRange } from '@/utils/dateHelpers';

interface Props {
  onSubmit: (params: QueryParams) => void;
  loading: boolean;
}

export default function ETFQueryForm({ onSubmit, loading }: Props) {
  const [idTicker, setIdTicker] = useState<string>('1');
  const [startDate, setStartDate] = useState<Date>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  );
  const [endDate, setEndDate] = useState<Date>(new Date());

  const handleSubmit = () => {
    const tickerId = parseInt(idTicker);
    
    // Validation
    if (isNaN(tickerId) || tickerId <= 0) {
      Alert.alert('Error', 'Please enter a valid ticker ID (positive number)');
      return;
    }

    if (!isValidDateRange(startDate, endDate)) {
      Alert.alert('Error', 'Please select a valid date range. End date cannot be in the future and must be after start date.');
      return;
    }

    const params: QueryParams = {
      id_ticker: tickerId,
      start_date: formatDateForAPI(startDate),
      end_date: formatDateForAPI(endDate),
    };

    onSubmit(params);
  };

  const handleStartDatePress = () => {
    Alert.alert(
      'Select Start Date',
      `Current: ${startDate.toLocaleDateString()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Last Week', 
          onPress: () => setStartDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        },
        { 
          text: 'Last Month', 
          onPress: () => setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        },
        { 
          text: 'Last 3 Months', 
          onPress: () => setStartDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        },
      ]
    );
  };

  const handleEndDatePress = () => {
    Alert.alert(
      'Select End Date',
      `Current: ${endDate.toLocaleDateString()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Today', 
          onPress: () => setEndDate(new Date())
        },
        { 
          text: 'Yesterday', 
          onPress: () => setEndDate(new Date(Date.now() - 24 * 60 * 60 * 1000))
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ETF Data Query</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Ticker ID</Text>
        <TextInput
          style={styles.input}
          value={idTicker}
          onChangeText={setIdTicker}
          placeholder="Enter ticker ID (e.g., 1)"
          keyboardType="numeric"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.dateRow}>
        <View style={styles.dateGroup}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={handleStartDatePress}
          >
            <Calendar size={20} color="#6B7280" />
            <Text style={styles.dateText}>
              {startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateGroup}>
          <Text style={styles.label}>End Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={handleEndDatePress}
          >
            <Calendar size={20} color="#6B7280" />
            <Text style={styles.dateText}>
              {endDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <TrendingUp size={20} color="#fff" />
        <Text style={styles.submitButtonText}>
          {loading ? 'Loading...' : 'Fetch Data'}
        </Text>
      </TouchableOpacity>
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    //gap: 12, // removed for Android compatibility
  },
  dateGroup: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    // gap: 8, // removed for Android compatibility
  },
  dateText: {
    fontSize: 16,
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // gap: 8, // removed for Android compatibility
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});