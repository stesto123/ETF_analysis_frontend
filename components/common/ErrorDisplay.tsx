import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CircleAlert as AlertCircle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/components/common/ThemeProvider';

interface Props {
  error: string;
  onRetry?: () => void;
}

export default function ErrorDisplay({ error, onRetry }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <AlertCircle size={48} color="#EF4444" />
      <Text style={[styles.title, { color: colors.text }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: colors.secondaryText }]}>{error}</Text>
      {onRetry && (
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.accent }]} onPress={onRetry}>
          <RefreshCw size={20} color="#fff" />
          <Text style={[styles.retryText, { color: '#fff' }]}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});