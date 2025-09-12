// app/_layout.tsx
import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as NavigationBar from 'expo-navigation-bar';
import { ThemeProvider, useTheme } from '@/components/common/ThemeProvider';

export default function RootLayout() {
  // Android: evita che la system navigation bar si sovrapponga,
  // e chiedi al sistema di fornire gli inset in basso.
  useEffect(() => {
    (async () => {
      try {
        await NavigationBar.setVisibilityAsync('visible');
        await NavigationBar.setBehaviorAsync('inset-swipe'); // fornisce insets corretti con gesture
        await NavigationBar.setPositionAsync('relative');    // non sovrappone i contenuti
        await NavigationBar.setBackgroundColorAsync('#FFFFFF');
        await NavigationBar.setButtonStyleAsync('dark');
      } catch {
        // iOS o ambienti dove l'API non è disponibile: nessun problema
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          {/* Consume theme inside to set StatusBar style */}
          <ThemedContent />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function ThemedContent() {
  const { isDark } = useTheme();
  return (
    <>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#FFFFFF' },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}