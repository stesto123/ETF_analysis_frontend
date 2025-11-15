import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle, Circle, Clock } from 'lucide-react-native';
import { useTheme } from '@/components/common/ThemeProvider';
import type { LearningLesson } from '@/constants/learningPaths';

type Props = {
  lesson: LearningLesson;
  completed: boolean;
  onOpen: () => void;
  onToggleComplete: () => void;
};

export default function LessonCard({ lesson, completed, onOpen, onToggleComplete }: Props) {
  const { colors } = useTheme();
  const CompletionIcon = completed ? CheckCircle : Circle;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <TouchableOpacity style={styles.headerRow} onPress={onToggleComplete} activeOpacity={0.8}>
        <CompletionIcon size={20} color={completed ? colors.accent : colors.secondaryText} />
        <Text style={[styles.title, { color: colors.text }]}>{lesson.title}</Text>
      </TouchableOpacity>

      <View style={styles.metaRow}>
        <Clock size={14} color={colors.secondaryText} />
        <Text style={[styles.metaText, { color: colors.secondaryText }]}>{lesson.duration}</Text>
      </View>

      <TouchableOpacity style={[styles.openButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={onOpen}>
        <Text style={[styles.openButtonText, { color: colors.text }]}>Open lesson</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    rowGap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  openButton: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    alignItems: 'center',
  },
  openButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
