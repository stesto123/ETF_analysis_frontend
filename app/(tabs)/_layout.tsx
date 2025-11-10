// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TrendingUp, Settings, MessageCircle, BookOpen } from 'lucide-react-native';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/common/ThemeProvider';
import { useAuth } from '@clerk/clerk-expo';
import { useAppPreferences } from '@/components/common/AppPreferencesProvider';

// Dev aid: log the first chars of the Clerk key so we can verify instance (pk_test vs pk_live)
if (__DEV__) {
  const pk = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
  console.log('CLERK PK', pk ? pk.slice(0, 12) : '(missing)');
}

export default function TabLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  if (__DEV__) {
    console.log('AUTH STATE', { isLoaded, isSignedIn });
  }
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { learnTabEnabled } = useAppPreferences();

  const bottomPad = Math.max(insets.bottom, 0);
  const baseHeight = 40; // barra più compatta, identica su iOS/Android

  if (!isLoaded) {
    return null; // o uno spinner
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const initialRoute = learnTabEnabled ? 'learn' : 'index';

  return (
    <Tabs
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: baseHeight + bottomPad, // più compatto
          paddingBottom: bottomPad,
          paddingTop: 2,                  // meno spazio sopra le icone
        },
        tabBarItemStyle: { paddingVertical: 0 }, // niente spazio extra
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: -1,                  // label più vicina all’icona
        },
      }}
    >
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          href: learnTabEnabled ? undefined : null,
          tabBarIcon: ({ size, color }) => (
            <View style={{ marginTop: -1 }}>
              <BookOpen size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ size, color }) => (
            <View style={{ marginTop: -1 }}>
              <TrendingUp size={size} color={color} />
            </View>
          ),
        }}
      />   
    
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ size, color }) => (
            <View style={{ marginTop: -1 }}>
              <MessageCircle size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="pipeline"
        options={{
          title: 'Pipeline',
          tabBarIcon: ({ size, color }) => (
            <View style={{ marginTop: -1 }}>
              <Ionicons name="git-network-outline" size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <View style={{ marginTop: -1 }}>
              <Settings size={size} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}