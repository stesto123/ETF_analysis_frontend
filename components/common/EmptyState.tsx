import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChartBar as BarChart3 } from 'lucide-react-native';
import { useTheme } from '@/components/common/ThemeProvider';

interface Props {
  title: string;
  message: string;
}

export default function EmptyState({ title, message }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <BarChart3 size={64} color={colors.secondaryText} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.secondaryText }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});