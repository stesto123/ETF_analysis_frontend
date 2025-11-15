import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tag, ListChecks } from 'lucide-react-native';
import { useTheme } from '@/components/common/ThemeProvider';
import type { LearningTopic } from '@/constants/learningPaths';
import LessonCard from '@/components/Learn/LessonCard';
import { TRACK_LABELS, TRACK_DESCRIPTIONS } from '@/constants/learningPaths';

type Props = {
  topic: LearningTopic;
  completedLessons: Set<string>;
  onOpenLesson: (lessonId: string) => void;
  onToggleLessonCompletion: (lessonId: string) => void;
};

export default function LearningTopicSection({ topic, completedLessons, onOpenLesson, onToggleLessonCompletion }: Props) {
  const { colors } = useTheme();
  const trackLabel = TRACK_LABELS[topic.track];
  const trackDescription = TRACK_DESCRIPTIONS[topic.track];

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={styles.headerRow}>
        <View style={[styles.trackPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Tag size={14} color={colors.accent} />
          <Text style={[styles.trackText, { color: colors.accent }]}>{trackLabel}</Text>
        </View>
        <Text style={[styles.topicTitle, { color: colors.text }]}>{topic.title}</Text>
        <Text style={[styles.topicSummary, { color: colors.secondaryText }]}>{topic.summary}</Text>
        <Text style={[styles.trackDescription, { color: colors.secondaryText }]}>{trackDescription}</Text>
      </View>

      <View style={styles.lessonsBlock}>
        {topic.lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            completed={completedLessons.has(lesson.id)}
            onOpen={() => onOpenLesson(lesson.id)}
            onToggleComplete={() => onToggleLessonCompletion(lesson.id)}
          />
        ))}
      </View>

      {topic.practice.length > 0 && (
        <View style={[styles.practiceCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.practiceHeader}>
            <ListChecks size={16} color={colors.accent} />
            <Text style={[styles.practiceTitle, { color: colors.text }]}>Practice missions</Text>
          </View>
          {topic.practice.map((item, index) => (
            <View key={item} style={styles.practiceRow}>
              <Text style={[styles.practiceIndex, { color: colors.secondaryText }]}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={[styles.practiceText, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    rowGap: 18,
  },
  headerRow: {
    rowGap: 10,
  },
  trackPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  trackText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  topicTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  topicSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  trackDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  lessonsBlock: {
    rowGap: 12,
  },
  practiceCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    rowGap: 12,
  },
  practiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  practiceTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  practiceRow: {
    flexDirection: 'row',
    columnGap: 12,
  },
  practiceIndex: {
    fontSize: 12,
    fontWeight: '700',
    width: 24,
  },
  practiceText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
