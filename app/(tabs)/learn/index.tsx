import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpenCheck, Compass, MessageSquare, Wand2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/components/common/ThemeProvider';
import MiniLessonCarousel from '@/components/Lessons/MiniLessonCarousel';
import LearningPathTimeline from '@/components/Learn/LearningPathTimeline';
import { LEARNING_GRAPH } from '@/constants/learningGraph';
import { useLearnProgress } from '@/components/Learn/LearnProgressProvider';

export default function LearnHomeScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completedLessons, toggleLessonCompletion, getLevelStats } = useLearnProgress();
  const heroStats = useMemo(() => getLevelStats('beginner'), [getLevelStats]);
  const heroGradient = isDark ? (['#0B1220', '#111827', '#0F172A'] as const) : (['#1F3A8A', '#1D4ED8', '#2563EB'] as const);

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

  const header = (
    <View style={{ paddingTop: Math.max(32, insets.top + 8), paddingBottom: 18 }}>
      <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <View style={styles.heroIconWrap}>
          <BookOpenCheck size={28} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <Text style={[styles.heroLabel, { color: 'rgba(255,255,255,0.85)' }]}>Learning graph</Text>
          <Text style={[styles.heroTitle, { color: '#FFFFFF' }]}>Guided ETF path</Text>
          <Text style={[styles.heroSubtitle, { color: 'rgba(255,255,255,0.92)' }]}>
            Vertical git-style track with lateral branches and nodes that fill as you complete lessons.
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroProgressBar}>
              <View
                style={[
                  styles.heroProgressFill,
                  { width: `${heroStats?.percent ?? 0}%`, backgroundColor: 'rgba(255,255,255,0.96)' },
                ]}
              />
            </View>
            <Text style={[styles.progressValue, { color: '#FFFFFF' }]}>{heroStats?.percent ?? 0}%</Text>
            <Text style={[styles.progressLabel, { color: 'rgba(255,255,255,0.85)' }]}>
              {heroStats?.completed ?? 0}/{heroStats?.total ?? 0} lezioni
            </Text>
          </View>
          <View style={styles.heroCtaRow}>
            <TouchableOpacity
              onPress={handleOpenAnalytics}
              style={[styles.heroCtaButton, { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.35)' }]}
              activeOpacity={0.9}
            >
              <Compass size={18} color="#FFFFFF" />
              <Text style={[styles.heroCtaText, { color: '#FFFFFF' }]}>Open analytics</Text>
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
      </LinearGradient>

      <View style={[styles.ribbon, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.ribbonItem}>
          <Wand2 size={16} color={colors.accent} />
          <Text style={[styles.ribbonText, { color: colors.text }]}>Track 0 → clearly visible side branches</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.ribbonText, { color: colors.secondaryText }]}>
          Tap any node to open the lesson, toggle the check to fill the dot.
        </Text>
      </View>
    </View>
  );

  const footer = (
    <View style={{ gap: 12, paddingBottom: Math.max(24, insets.bottom + 8) }}>
      <Text style={[styles.footerTitle, { color: colors.text }]}>Micro-lesson drops</Text>
      <Text style={[styles.footerSubtitle, { color: colors.secondaryText }]}>
        Quick extras to strengthen the path or refresh before the next node.
      </Text>
      <MiniLessonCarousel />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LearningPathTimeline
        stages={LEARNING_GRAPH}
        completedLessons={completedLessons}
        onOpenLesson={openLesson}
        onToggleLessonCompletion={toggleLessonCompletion}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
      />
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
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  heroProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: 8,
    borderRadius: 8,
  },
  ribbon: {
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    rowGap: 10,
  },
  ribbonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    opacity: 0.6,
  },
  ribbonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  footerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
});
