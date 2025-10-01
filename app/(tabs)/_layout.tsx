// app/(tabs)/_layout.tsx
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TrendingUp, Settings } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/common/ThemeProvider';
import { useAuth } from '@clerk/clerk-expo';

export default function TabLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const extraAndroidBottom = Platform.OS === 'android' ? 0 : 0;
  const bottomPad = Math.max(insets.bottom, 0) + extraAndroidBottom;

  // riduciamo la base di altezza
  const baseHeight = Platform.OS === 'ios' ? 40 : 40;

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
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
        tabBarIconStyle: { marginTop: -1 }, // micro-shift verso l’alto
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ size, color }) => <TrendingUp size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pipeline"
        options={{
          title: 'Pipeline',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="git-network-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}