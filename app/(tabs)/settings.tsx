import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, Info, Sparkles, Sun, Moon, BarChart3 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '@/services/api';
import SignOutButton from '@/components/common/SignOutButton';
import { useChartSettings, CHART_MAX_POINTS_LIMITS } from '@/components/common/ChartSettingsProvider';
import { useTheme } from '@/components/common/ThemeProvider';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { setTheme, isDark, colors } = useTheme();
  const { maxPoints, setMaxPoints } = useChartSettings();
  const [draft, setDraft] = useState(String(maxPoints));
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(maxPoints));
  }, [maxPoints]);

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n)) { setFeedback('Please enter a valid number'); return; }
    if (n < CHART_MAX_POINTS_LIMITS.MIN || n > CHART_MAX_POINTS_LIMITS.MAX) {
      setFeedback(`Value must be between ${CHART_MAX_POINTS_LIMITS.MIN} and ${CHART_MAX_POINTS_LIMITS.MAX}`);
      return;
    }
    setFeedback(null);
    setMaxPoints(n);
    Alert.alert('Updated', `Max chart points set to ${n}`);
  };
  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached data? This will remove all locally stored ETF data.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.clearCache();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              console.error('Failed to clear cache', error);
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const showAbout = () => {
    Alert.alert(
      'About ETF Analytics',
      'This app provides real-time analysis of ETF data through interactive charts and comprehensive analytics.\n\nVersion: 1.0.0\nDeveloped with React Native & Expo',
      [{ text: 'OK' }]
    );
  };

  const ThemeIcon = isDark ? Moon : Sun;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 24) }]}
      >

        <LinearGradient
          colors={isDark ? ['#0F172A', '#1F2937'] : ['#2563EB', '#1E40AF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroIconWrap}>
            <Sparkles size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Personalizza la tua esperienza</Text>
            <Text style={styles.heroSubtitle}>
              Controlla tema, preferenze dei grafici e gestione dei dati per lavorare in modo più fluido.
            </Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatPill}>
                <ThemeIcon size={16} color="#FFFFFF" />
                <Text style={styles.heroStatText}>{isDark ? 'Tema scuro attivo' : 'Tema chiaro attivo'}</Text>
              </View>
              <View style={styles.heroStatPill}>
                <BarChart3 size={16} color="#FFFFFF" />
                <Text style={styles.heroStatText}>Max punti: {maxPoints}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Aspetto</Text>
          <TouchableOpacity
            style={[styles.settingRow, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setTheme(isDark ? 'light' : 'dark')}
            activeOpacity={0.85}
          >
            <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}> 
              <ThemeIcon size={20} color="#FFFFFF" />
            </View>
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Tema</Text>
              <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>Tocca per alternare tra chiaro e scuro</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Grafici</Text>
          <View style={[styles.settingRow, styles.settingRowColumn, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={styles.settingHeader}>
              <BarChart3 size={22} color={colors.accent} />
              <View style={styles.settingTextSpace}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Max punti per linea</Text>
                <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>Default {CHART_MAX_POINTS_LIMITS.DEFAULT} · intervallo {CHART_MAX_POINTS_LIMITS.MIN}-{CHART_MAX_POINTS_LIMITS.MAX}</Text>
              </View>
            </View>
            <View style={styles.inputRowInline}>
              <TextInput
                style={[styles.numberInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                keyboardType="number-pad"
                value={draft}
                onChangeText={setDraft}
                placeholder="60"
                placeholderTextColor={colors.secondaryText}
                maxLength={4}
              />
              <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.accent }]} onPress={commit} activeOpacity={0.85}>
                <Text style={styles.applyBtnText}>Applica</Text>
              </TouchableOpacity>
            </View>
            {feedback && <Text style={[styles.errorText, { color: '#DC2626' }]}>{feedback}</Text>}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Gestione dati</Text>
          <TouchableOpacity
            style={[styles.settingRow, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={handleClearCache}
            activeOpacity={0.85}
          >
            <View style={[styles.settingIcon, styles.dangerIcon]}>
              <Trash2 size={20} color="#FFFFFF" />
            </View>
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Svuota cache</Text>
              <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>Rimuove i dati archiviati localmente</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Applicazione</Text>
          <TouchableOpacity
            style={[styles.settingRow, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={showAbout}
            activeOpacity={0.85}
          >
            <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}>
              <Info size={20} color="#FFFFFF" />
            </View>
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Informazioni</Text>
              <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>Dettagli versione e credits</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.signOutWrapper}>
            <SignOutButton />
          </View>
        </View>

        <View style={[styles.apiCard, { backgroundColor: colors.card, borderColor: colors.accent }]}>
          <Text style={[styles.apiTitle, { color: colors.text }]}>Endpoint API</Text>
          <Text style={[styles.apiText, { color: colors.secondaryText }]}>Base URL: wa-etf-analysis-d0enavd0h5e9f5gr.italynorth-01.azurewebsites.net</Text>
          <Text style={[styles.apiText, { color: colors.secondaryText }]}>Endpoint: /api/dati</Text>
          <Text style={[styles.apiText, { color: colors.secondaryText }]}>Cache locale: 1 ora per risposte più rapide</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    rowGap: 20,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 8,
    lineHeight: 20,
  },
  heroStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 10,
    marginTop: 16,
  },
  heroStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    columnGap: 16,
  },
  settingRowColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: 14,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 14,
  },
  settingTextSpace: {
    flex: 1,
  },
  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerIcon: {
    backgroundColor: '#EF4444',
  },
  settingText: {
    flex: 1,
    rowGap: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  inputRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  numberInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minWidth: 90,
  },
  applyBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
  },
  signOutWrapper: {
    marginTop: 16,
  },
  apiCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  apiTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  apiText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
});
