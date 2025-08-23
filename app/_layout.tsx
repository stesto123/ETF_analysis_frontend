// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';

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
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}