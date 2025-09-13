import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2, Info } from 'lucide-react-native';
import { apiService } from '@/services/api';
import { useTheme } from '@/components/common/ThemeProvider';

export default function SettingsScreen() {
  const { theme, setTheme, isDark, colors } = useTheme();
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Appearance</Text>
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
            onPress={() => setTheme(isDark ? 'light' : 'dark')}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Theme</Text>
                <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
                  {isDark ? 'Dark' : 'Light'} (tap to toggle)
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Data Management</Text>
          
          <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]} onPress={handleClearCache}>
            <View style={styles.settingLeft}>
              <Trash2 size={24} color="#EF4444" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Clear Cache</Text>
                <Text style={[styles.settingDescription, { color: colors.secondaryText }] }>
                  Remove all locally stored data
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Application</Text>
          
          <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]} onPress={showAbout}>
            <View style={styles.settingLeft}>
              <Info size={24} color="#3B82F6" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>About</Text>
                <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
                  App information and version
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.apiInfo, { backgroundColor: colors.card, borderLeftColor: colors.accent }] }>
          <Text style={[styles.apiTitle, { color: colors.text }]}>API Information</Text>
          <Text style={[styles.apiText, { color: colors.secondaryText }] }>
            Base URL: wa-etf-analysis-d0enavd0h5e9f5gr.italynorth-01.azurewebsites.net
          </Text>
          <Text style={[styles.apiText, { color: colors.secondaryText }] }>
            Endpoint: /api/dati
          </Text>
          <Text style={[styles.apiText, { color: colors.secondaryText }] }>
            Data is cached locally for 1 hour to improve performance
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    margin: 20,
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  apiInfo: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  apiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  apiText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 20,
  },
});