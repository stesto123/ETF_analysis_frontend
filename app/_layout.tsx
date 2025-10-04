// app/_layout.tsx
import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
// Opzione A: se usi il token cache built-in
// import { tokenCache } from '@clerk/clerk-expo';

// Opzione B: se hai un wrapper personalizzato (come nel tuo progetto)
import { tokenCache } from '@/utils/tokenCache';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as NavigationBar from 'expo-navigation-bar';
import { ThemeProvider, useTheme } from '@/components/common/ThemeProvider';
import { ChartSettingsProvider } from '@/components/common/ChartSettingsProvider';
import { ActivityIndicator, View } from 'react-native';
import { setClerkTokenGetter } from '@/utils/clerkToken';

export default function RootLayout() {
  // Basta che ClerkProvider stia più in alto di qualunque hook/useAuth o componenti che lo usano
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider
        publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string}
        tokenCache={tokenCache}
      >
        <ThemeProvider>
          <ChartSettingsProvider>
            <SafeAreaProvider>
              <ClerkTokenBridge />
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
        // Non-Android o API assente: ignora
      }
    })();
  }, [colors.background, isDark]);

  // Finché Clerk non ha caricato lo stato auth, mostra uno splash coerente col tema
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
        {/* Gruppo auth */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        {/* Rotte protette */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

function ClerkTokenBridge() {
  const { getToken } = useAuth();
  // Optionally use a JWT template configured in Clerk dashboard
  const template = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;

  useEffect(() => {
    // Install getter; returns a fresh token when called
    setClerkTokenGetter(async () => {
      try {
        const token = await getToken({ template: template || undefined });
        return token ?? null;
      } catch {
        return null;
      }
    });
  }, [getToken, template]);

  return null;
}