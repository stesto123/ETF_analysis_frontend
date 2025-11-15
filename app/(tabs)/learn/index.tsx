import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpenCheck, Compass, MessageSquare } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/components/common/ThemeProvider';
import MiniLessonCarousel from '@/components/Lessons/MiniLessonCarousel';
import LevelTabs from '@/components/Learn/LevelTabs';
import LearningTopicSection from '@/components/Learn/LearningTopicSection';
import { LEARNING_LEVELS, LEARNING_PATHS, type LearningLevelId } from '@/constants/learningPaths';
import { useLearnProgress } from '@/components/Learn/LearnProgressProvider';

export default function LearnHomeScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedLevel, setSelectedLevel, getLevelStats, completedLessons, toggleLessonCompletion } = useLearnProgress();

  const levelStats = useMemo<Record<LearningLevelId, ReturnType<typeof getLevelStats>>>(() => ({
    beginner: getLevelStats('beginner'),
    intermediate: getLevelStats('intermediate'),
    advanced: getLevelStats('advanced'),
  }), [getLevelStats]);

  const heroStats = levelStats[selectedLevel];
  const heroGradient = isDark ? (['#0F172A', '#1F2937', '#111827'] as const) : (['#2563EB', '#1D4ED8', '#1E3A8A'] as const);

  const topics = LEARNING_PATHS[selectedLevel];

  const handleOpenAnalytics = () => {
    router.push('/(tabs)');
  };

  const handleOpenChat = () => {
    router.push('/(tabs)/chat');
  };

  const openLesson = (lessonId: string) => {
    router.push({
      pathname: '/(tabs)/learn/[lessonId]',
      params: { lessonId },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(24, insets.bottom + 12),
          paddingTop: Math.max(36, insets.top + 12),
          rowGap: 18,
        }}
      >
        <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <BookOpenCheck size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: '#FFFFFF' }]}>Learn ETFs with structure</Text>
            <Text style={[styles.heroSubtitle, { color: 'rgba(255,255,255,0.92)' }]}>
              Choose a level, follow curated topics, and connect lessons to analytics, chat, and the pipeline.
            </Text>
            <View style={styles.heroCtaRow}>
              <TouchableOpacity
                onPress={handleOpenAnalytics}
                style={[styles.heroCtaButton, { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.35)' }]}
                activeOpacity={0.9}
              >
                <Compass size={18} color="#FFFFFF" />
                <Text style={[styles.heroCtaText, { color: '#FFFFFF' }]}>Explore analytics</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleOpenChat}
                style={[styles.heroCtaButton, { backgroundColor: 'rgba(15,23,42,0.85)', borderColor: 'rgba(255,255,255,0.12)' }]}
                activeOpacity={0.9}
              >
                <MessageSquare size={18} color="#FFFFFF" />
                <Text style={[styles.heroCtaText, { color: '#FFFFFF' }]}>Ask the AI</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.progressWrap}>
            <View style={[styles.progressRing, { borderColor: 'rgba(255,255,255,0.45)' }]}>
              <Text style={styles.progressValue}>{heroStats?.percent ?? 0}%</Text>
              <Text style={styles.progressLabel}>Complete</Text>
            </View>
            <Text style={styles.progressSubLabel}>
              {heroStats?.completed ?? 0}/{heroStats?.total ?? 0} lessons
            </Text>
          </View>
        </LinearGradient>

        <LevelTabs
          levels={LEARNING_LEVELS}
          selectedLevel={selectedLevel}
          onSelect={setSelectedLevel}
          stats={levelStats}
        />

        <MiniLessonCarousel />

        {topics.map((topic) => (
          <LearningTopicSection
            key={topic.id}
            topic={topic}
            completedLessons={completedLessons}
            onOpenLesson={openLesson}
            onToggleLessonCompletion={toggleLessonCompletion}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroCard: {
    borderRadius: 26,
    padding: 22,
    flexDirection: 'row',
    columnGap: 18,
    alignItems: 'flex-start',
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  heroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 18,
  },
  heroCtaRow: {
    flexDirection: 'row',
    columnGap: 12,
    flexWrap: 'wrap',
  },
  heroCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroCtaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 6,
  },
  progressRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
  progressSubLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
});
