// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@/utils/tokenCache';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as NavigationBar from 'expo-navigation-bar';
import { ThemeProvider, useTheme } from '@/components/common/ThemeProvider';
import { ChartSettingsProvider } from '@/components/common/ChartSettingsProvider';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  // Lasciamo a ThemedContent l'aggiornamento dei colori della system navigation bar

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string} tokenCache={tokenCache}>
        <ThemeProvider>
          <ChartSettingsProvider>
            <SafeAreaProvider>
              {/* Consume theme inside to set StatusBar style */}
              <ThemedContent />
            </SafeAreaProvider>
          </ChartSettingsProvider>
        </ThemeProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

function ThemedContent() {
  const { isDark, colors } = useTheme();
  const { isLoaded, isSignedIn } = useAuth();

  // Android Navigation Bar styling bound to theme
  useEffect(() => {
    (async () => {
      try {
        await NavigationBar.setVisibilityAsync('visible');
        await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
      } catch {
        // Non-Android or missing API: ignore
      }
    })();
  }, [colors.background, isDark]);
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack
        initialRouteName={isSignedIn ? '(tabs)' : '(auth)'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Auth route group */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        {/* Protected app routes */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}