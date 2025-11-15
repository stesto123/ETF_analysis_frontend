// app/_layout.tsx
import 'react-native-url-polyfill/auto';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { shouldShowOnboarding } from '@/utils/onboardingPreferences';
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
import { AppPreferencesProvider } from '@/components/common/AppPreferencesProvider';

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
            <AppPreferencesProvider>
              <SafeAreaProvider>
                <ClerkTokenBridge />
                <ThemedContent />
              </SafeAreaProvider>
            </AppPreferencesProvider>
          </ChartSettingsProvider>
        </ThemeProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

function ThemedContent() {
  const { isDark, colors } = useTheme();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

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

  useEffect(() => {
    if (!isLoaded || !isSignedIn || onboardingChecked) {
      return;
    }
    let active = true;
    (async () => {
      const display = await shouldShowOnboarding();
      if (display && active && segments[0] !== 'onboarding') {
        router.replace('/onboarding');
      }
      if (active) {
        setOnboardingChecked(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, router, segments, onboardingChecked]);

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
        initialRouteName={isSignedIn ? '(tabs)' : 'onboarding'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
  {/* Onboarding */}
  <Stack.Screen name="onboarding" options={{ headerShown: false }} />
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

  // Register the getter synchronously to minimize race conditions with first API calls
  setClerkTokenGetter(async () => {
    try {
      // Try with template (if provided), otherwise default
      let token: string | null = null;
      if (template) {
        token = await getToken({ template, skipCache: true });
      } else {
        token = await getToken({ skipCache: true });
      }
      // Fallback: if template was set but returned null, try without template
      if (!token && template) {
        token = await getToken({ skipCache: true });
      }
          // Rimosso log JWT token
      return token ?? null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (__DEV__) {
      console.log('ClerkTokenBridge ready', { template: template || '(none)' });
    }
  }, [template]);

  return null;
}