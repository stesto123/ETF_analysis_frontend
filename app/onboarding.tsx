import React, { useMemo, useState, useCallback, useRef } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/components/common/ThemeProvider';
import { Sprout, Layers, MessageCircle, Signpost } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { markOnboardingSeen } from '@/utils/onboardingPreferences';

const softBackground = '#F5F7FB';

type OnboardingSlide = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: readonly [string, string];
  accent: string;
  circle: string;
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [index, setIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const completionLock = useRef(false);

  const slides = useMemo<OnboardingSlide[]>(
    () => [
      {
        id: '1',
        title: 'Investing Can Be Simple',
        description: 'You don\'t need to be an expert. This app helps you learn step-by-step.',
        icon: Sprout,
  gradient: ['#C7D2FE', '#DBEAFE'] as const,
        accent: '#6366F1',
        circle: 'rgba(99,102,241,0.16)',
      },
      {
        id: '2',
        title: 'Why ETFs?',
        description: 'ETFs let you invest in many companies at once. This spreads risk and keeps things simple.',
        icon: Layers,
  gradient: ['#A5F3FC', '#BFDBFE'] as const,
        accent: '#0EA5E9',
        circle: 'rgba(14,165,233,0.16)',
      },
      {
        id: '3',
        title: 'Ask Anything',
        description: 'Use the AI chat to explore concepts, compare ETFs, or ask for explanations.',
        icon: MessageCircle,
  gradient: ['#FDE68A', '#FBCFE8'] as const,
        accent: '#F59E0B',
        circle: 'rgba(245,158,11,0.16)',
      },
      {
        id: '4',
        title: 'Learn at Your Pace',
        description: 'Browse lessons, explore tools, and discover investing step-by-step.',
  icon: Signpost,
  gradient: ['#BBF7D0', '#DCFCE7'] as const,
        accent: '#16A34A',
        circle: 'rgba(22,163,74,0.16)',
      },
    ],
    []
  );

  const slide = slides[index];
  const IconComponent = slide.icon;
  const isLast = index === slides.length - 1;
  const showSkip = !isLast;

  const completeOnboarding = useCallback(async () => {
    if (completionLock.current) {
      return;
    }
    completionLock.current = true;
    setIsProcessing(true);
    await markOnboardingSeen();
    const target = isSignedIn ? '/(tabs)' : '/(auth)/sign-in';
    router.replace(target);
  }, [isSignedIn, router]);

  const handleNext = () => {
    if (isProcessing) {
      return;
    }
    if (isLast) {
      void completeOnboarding();
      return;
    }
    setIndex((current) => Math.min(current + 1, slides.length - 1));
  };

  const handleSkip = () => {
    if (isProcessing) {
      return;
    }
    void completeOnboarding();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : softBackground }]}> 
      <View style={styles.headerRow}>
        {showSkip && (
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} disabled={isProcessing}>
            <Text style={[styles.skipText, { color: colors.secondaryText }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.illustrationWrapper}>
          <LinearGradient
            colors={slide.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.illustrationCard}
          >
            <View style={[styles.illustrationCircle, { backgroundColor: slide.circle }]} />
            <IconComponent size={72} color={slide.accent} />
            <View style={[styles.baseBar, { backgroundColor: slide.circle }]} />
          </LinearGradient>
        </View>

        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
          <Text style={[styles.description, { color: colors.secondaryText }]}>{slide.description}</Text>
        </View>
      </View>

  <View style={[styles.footer, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
        <View style={styles.progressRow}>
          {slides.map((item, itemIndex) => (
            <View
              key={item.id}
              style={[
                styles.progressDot,
                itemIndex === index && {
                  width: 28,
                  backgroundColor: slide.accent,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: slide.accent, opacity: isProcessing ? 0.7 : 1 }]}
          activeOpacity={0.85}
          onPress={handleNext}
          disabled={isProcessing}
        >
          <Text style={styles.primaryButtonText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerRow: {
    alignItems: 'flex-end',
    minHeight: 32,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  illustrationCard: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1.05,
    borderRadius: 28,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationCircle: {
    position: 'absolute',
    width: '68%',
    aspectRatio: 1,
    borderRadius: 999,
    top: '16%',
  },
  baseBar: {
    position: 'absolute',
    bottom: 32,
    width: '60%',
    height: 14,
    borderRadius: 12,
  },
  textBlock: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    rowGap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 24,
    rowGap: 24,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 10,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#CED3E0',
  },
  primaryButton: {
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
