import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/components/common/ThemeProvider';
import { Layers, Sprout, BarChart3, ShieldCheck, Wallet, Search, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

const CARD_GAP = 20;
const MAX_CARD_WIDTH = 360;

const friendlyAccent = (hex: string, alpha = 0.18) => {
  return hex.replace('#', '').length === 6 ? `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${alpha})` : 'rgba(99,102,241,0.2)';
};

type Lesson = {
  id: string;
  label: string;
  prompt: string;
  detail: string;
  gradient: readonly [string, string];
  accent: string;
  icon: LucideIcon;
};

const LESSONS: Lesson[] = [
  {
    id: 'lesson-1',
    label: 'Lesson 1',
    prompt: 'What is an ETF?',
    detail: "An ETF is like a basket of investments. One purchase gives you a slice of many companies so you're diversified instantly.",
    gradient: ['#E0EAFF', '#EFF5FF'],
    accent: '#2563EB',
    icon: Layers,
  },
  {
    id: 'lesson-2',
    label: 'Lesson 2',
    prompt: 'Why should I use ETFs?',
    detail: 'ETFs bundle lots of companies, keep fees low, and track the market for you. You get growth potential without picking every stock.',
    gradient: ['#DFF7EC', '#F1FFF6'],
    accent: '#16A34A',
    icon: Sprout,
  },
  {
    id: 'lesson-3',
    label: 'Lesson 3',
    prompt: 'How do ETFs simplify investing?',
    detail: 'They trade like a normal stock but hold hundreds of assets inside. Buy, sell, and track them in seconds—no complex setup required.',
    gradient: ['#FFEAD5', '#FFF6EA'],
    accent: '#F97316',
    icon: BarChart3,
  },
  {
    id: 'lesson-4',
    label: 'Lesson 4',
    prompt: 'Do ETFs still have risk?',
    detail: 'Yes, prices move daily. Diversification softens the blow of one bad stock, and staying invested longer helps smooth the bumps.',
    gradient: ['#E3E9FF', '#F0F4FF'],
    accent: '#4F46E5',
    icon: ShieldCheck,
  },
  {
    id: 'lesson-5',
    label: 'Lesson 5',
    prompt: 'What do ETFs cost?',
    detail: "Most ETFs charge a small expense ratio, often below 0.5% per year. Lower fees mean more of your money keeps compounding.",
    gradient: ['#FFF1DB', '#FFF8EC'],
    accent: '#F59E0B',
    icon: Wallet,
  },
  {
    id: 'lesson-6',
    label: 'Lesson 6',
    prompt: 'How can this app help?',
    detail: 'Browse curated lessons, ask the AI chat quick questions, and keep a watchlist of ETFs that spark your interest.',
    gradient: ['#EAF8FF', '#F5FBFF'],
    accent: '#0EA5E9',
    icon: Search,
  },
  {
    id: 'lesson-7',
    label: 'Lesson 7',
    prompt: 'What should I do next?',
    detail: 'Pick an ETF, let the AI explain it, and decide how it fits your goals. Learning a little each day builds confidence.',
    gradient: ['#E8FFF2', '#F4FFF8'],
    accent: '#22C55E',
    icon: CheckCircle,
  },
];

export default function MiniLessonCarousel() {
  const scrollRef = useRef<ScrollView>(null);
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});
  const activeLesson = LESSONS[activeIndex] ?? LESSONS[0];
  const activeAccent = activeLesson?.accent ?? '#2563EB';

  const cardWidth = useMemo(() => Math.min(MAX_CARD_WIDTH, width - 56), [width]);
  const sidePadding = useMemo(() => Math.max(16, (width - cardWidth) / 2), [width, cardWidth]);
  const snapInterval = cardWidth + CARD_GAP;

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const nextIndex = Math.round(contentOffset.x / snapInterval);
    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
    }
  };

  const goToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, LESSONS.length - 1));
      const x = clamped * snapInterval;
      scrollRef.current?.scrollTo({ x, animated: true });
      setActiveIndex(clamped);
    },
    [snapInterval]
  );

  const handlePrev = () => {
    if (activeIndex === 0) return;
    goToIndex(activeIndex - 1);
  };

  const handleNext = () => {
    if (activeIndex >= LESSONS.length - 1) return;
    goToIndex(activeIndex + 1);
  };

  const toggleCard = (lessonId: string) => {
    setRevealedCards((prev) => ({ ...prev, [lessonId]: !prev[lessonId] }));
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: isDark ? colors.card : '#F7F9FC', borderColor: colors.border }]}> 
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Mini lessons</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Swipe to learn the basics</Text>
        </View>
        <View style={[styles.counterBadge, { backgroundColor: colors.background }]}>
          <Text style={[styles.counterText, { color: colors.secondaryText }]}>
            {String(activeIndex + 1).padStart(2, '0')}/{String(LESSONS.length).padStart(2, '0')}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingHorizontal: sidePadding, paddingVertical: 12 }}
      >
        {LESSONS.map((lesson, index) => {
          const Icon = lesson.icon;
          const revealed = !!revealedCards[lesson.id];
          return (
            <TouchableOpacity
              key={lesson.id}
              activeOpacity={0.9}
              onPress={() => toggleCard(lesson.id)}
              style={[styles.cardShadow, { width: cardWidth, marginRight: index === LESSONS.length - 1 ? 0 : CARD_GAP }]}
            >
              <LinearGradient
                colors={lesson.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(148,163,184,0.18)' }]}
              >
                <View style={[styles.iconWrap, { backgroundColor: friendlyAccent(lesson.accent) }]}>
                  <Icon size={28} color={lesson.accent} />
                </View>
                <View style={styles.cardTextBlock}>
                  <Text style={[styles.cardLabel, { color: colors.secondaryText }]}>{lesson.label}</Text>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{lesson.prompt}</Text>
                  <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                    {revealed ? lesson.detail : 'Tap to reveal a quick explainer.'}
                  </Text>
                </View>
                <View style={styles.footerRow}>
                  <Text style={[styles.flipHint, { color: colors.secondaryText }]}>
                    {revealed ? 'Tap again to hide' : 'Tap card to flip'}
                  </Text>
                  <View style={[styles.progressDots, { columnGap: 6 }]}>
                    {LESSONS.map((_, dotIndex) => (
                      <View
                        key={`${lesson.id}-dot-${dotIndex}`}
                        style={[
                          styles.dot,
                          dotIndex === activeIndex && { backgroundColor: activeAccent },
                          dotIndex !== activeIndex && { backgroundColor: friendlyAccent(activeAccent, 0.35) },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          onPress={handlePrev}
          style={[styles.controlBtn, { borderColor: colors.border, backgroundColor: colors.background, opacity: activeIndex === 0 ? 0.6 : 1 }]}
          disabled={activeIndex === 0}
        >
          <ChevronLeft size={18} color={colors.text} />
          <Text style={[styles.controlText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNext}
          style={[styles.controlBtn, { borderColor: colors.border, backgroundColor: colors.background, opacity: activeIndex >= LESSONS.length - 1 ? 0.6 : 1 }]}
          disabled={activeIndex >= LESSONS.length - 1}
        >
          <Text style={[styles.controlText, { color: colors.text }]}>Next</Text>
          <ChevronRight size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 24,
    paddingVertical: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginTop: 4,
  },
  counterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  cardShadow: {
    borderRadius: 24,
    shadowColor: '#101828',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    justifyContent: 'space-between',
    height: 280,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardTextBlock: {
    rowGap: 10,
  },
  cardLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  flipHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressDots: {
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  controlText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
