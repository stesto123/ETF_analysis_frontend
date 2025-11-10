import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpenCheck, MessageSquare, Compass } from 'lucide-react-native';
import { useTheme } from '@/components/common/ThemeProvider';
import MiniLessonCarousel from '@/components/Lessons/MiniLessonCarousel';
import { useRouter } from 'expo-router';

export default function LearnScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const heroGradient = isDark
    ? (['#0F172A', '#1E3A8A'] as const)
    : (['#DBEAFE', '#BFDBFE'] as const);

  const handleOpenChat = () => {
    router.push('/(tabs)/chat');
  };

  const handleOpenAnalytics = () => {
    router.push('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(24, insets.bottom + 12), rowGap: 20 }}
      >
        <LinearGradient
          colors={heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroIconWrap}>
            <BookOpenCheck size={28} color="#1E40AF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Learn the ETF essentials</Text>
            <Text style={styles.heroSubtitle}>
              Bite-sized lessons help you understand ETFs, risk, and fees. Swipe through topics, then jump into the app to put them in action.
            </Text>
            <View style={styles.heroCtaRow}>
              <TouchableOpacity
                onPress={handleOpenAnalytics}
                style={[styles.heroCtaButton, { backgroundColor: 'rgba(30,64,175,0.12)', borderColor: 'rgba(30,64,175,0.25)' }]}
                activeOpacity={0.9}
              >
                <Compass size={18} color="#1E3A8A" />
                <Text style={[styles.heroCtaText, { color: '#1E3A8A' }]}>Explore analytics</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleOpenChat}
                style={[styles.heroCtaButton, { backgroundColor: 'rgba(30,64,175,0.9)' }]}
                activeOpacity={0.9}
              >
                <MessageSquare size={18} color="#FFFFFF" />
                <Text style={[styles.heroCtaText, { color: '#FFFFFF' }]}>Ask the AI</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <MiniLessonCarousel />

        <View style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.tipTitle, { color: colors.text }]}>Try this next</Text>
          <Text style={[styles.tipDescription, { color: colors.secondaryText }]}>
            Browse a few ETFs you\'re curious about, add them to your watchlist, and ask the AI how they differ. Revisit these lessons anytime for a quick refresher.
          </Text>
        </View>
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
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(30,58,138,0.85)',
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
  tipCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipDescription: {
    fontSize: 14,
    lineHeight: 21,
  },
});
