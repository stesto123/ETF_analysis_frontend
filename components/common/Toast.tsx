import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CircleCheck, CircleAlert, Info, TriangleAlert, X } from 'lucide-react-native';
import { useTheme } from '@/components/common/ThemeProvider';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

type Props = {
  type?: ToastType;
  message: string;
  onClose?: () => void;
};

const iconByType: Record<ToastType, React.ComponentType<any>> = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
  warning: TriangleAlert,
};

const bgByType: Record<ToastType, string> = {
  success: '#ECFDF5',
  error: '#FEF2F2',
  info: '#EFF6FF',
  warning: '#FFFBEB',
};

const borderByType: Record<ToastType, string> = {
  success: '#34D399',
  error: '#F87171',
  info: '#60A5FA',
  warning: '#F59E0B',
};

const textByType: Record<ToastType, string> = {
  success: '#065F46',
  error: '#991B1B',
  info: '#1E40AF',
  warning: '#92400E',
};

export default function Toast({ type = 'info', message, onClose }: Props) {
  const { isDark } = useTheme();
  const Icon = iconByType[type];
  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : bgByType[type],
        borderColor: borderByType[type],
      },
    ]}>
      <Icon size={18} color={borderByType[type]} style={{ marginRight: 8 }} />
      <Text style={[styles.text, { color: textByType[type] }]} numberOfLines={3}>
        {message}
      </Text>
      {onClose && (
        <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
          <X size={16} color={textByType[type]} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: 'rgba(0,0,0,0.7)',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
