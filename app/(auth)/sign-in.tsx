import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useTheme } from '@/components/common/ThemeProvider';
import { useSignIn } from '@clerk/clerk-expo';

export default function SignInScreen() {
  const { colors } = useTheme();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastInfo, setLastInfo] = useState<any>(null);
  const [showFullDebug, setShowFullDebug] = useState(false);

  const pkPrefix = useMemo(() => (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '').slice(0, 10), []);

  const start = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);
    try {
      const created = await signIn.create({ identifier: email.trim() });
      setLastInfo({ step: 'after-create', status: created?.status, supportedFirstFactors: created?.supportedFirstFactors });
      const emailFactor = (created as any)?.supportedFirstFactors?.find(
        (f: any) => f?.strategy === 'email_code' && f?.emailAddressId
      );
      const emailAddressId = emailFactor?.emailAddressId as string | undefined;
      if (!emailAddressId) {
        throw new Error('Email verification is not available. Check Clerk Email Code settings.');
      }
      const prep = await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId });
      setLastInfo((prev: any) => ({ ...prev, step: 'after-prepare', prepareStatus: prep?.status }));
      setStep('code');
    } catch (e: any) {
      console.log('SEND-CODE ERROR', JSON.stringify(e, null, 2));
      setLastInfo({ step: 'error', error: e });
      setError(e?.errors?.[0]?.message ?? 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      });
      setLastInfo((prev: any) => ({ ...prev, step: 'after-attempt', attemptStatus: attempt?.status }));
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)');
        return;
      } else {
        setError('Invalid code');
      }
    } catch (e: any) {
      console.log('SIGN-IN ERROR', JSON.stringify(e, null, 2));
      setLastInfo({ step: 'error', error: e });
      setError(e?.errors?.[0]?.message ?? 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background, justifyContent: 'center' }}>
      {__DEV__ && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 8, backgroundColor: '#1f2937' }}>
          <Text style={{ color: '#93c5fd', fontWeight: '700' }}>Clerk Debug</Text>
          <Text style={{ color: '#e5e7eb' }}>PK: {pkPrefix}…</Text>
          <Text style={{ color: '#e5e7eb' }}>isLoaded: {String(isLoaded)}</Text>
          <Text style={{ color: '#93c5fd', marginTop: 4, fontWeight: '600' }}>lastInfo</Text>
          <ScrollView style={showFullDebug ? undefined : { maxHeight: 200 }}>
            <Text style={{ color: '#e5e7eb', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), fontSize: 12 }}>
              {(() => {
                try { return JSON.stringify(lastInfo, null, 2); } catch { return 'n/a'; }
              })()}
            </Text>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <Pressable onPress={() => setShowFullDebug((v) => !v)} style={{ backgroundColor: '#374151', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 }}>
              <Text style={{ color: '#e5e7eb' }}>{showFullDebug ? 'Collapse' : 'Expand'}</Text>
            </Pressable>
            <Pressable onPress={() => { try { console.log('CLERK lastInfo FULL', JSON.stringify(lastInfo, null, 2)); } catch {} }} style={{ backgroundColor: '#374151', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 }}>
              <Text style={{ color: '#e5e7eb' }}>Log to console</Text>
            </Pressable>
          </View>
        </View>
      )}
      <Text style={{ color: colors.text, fontSize: 24, marginBottom: 16 }}>Sign in</Text>
  {error && <Text style={{ color: 'tomato', marginBottom: 8 }}>{error}</Text>}
      {step === 'email' ? (
        <>
          <Text style={{ color: colors.secondaryText, marginBottom: 6 }}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.secondaryText}
            style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, padding: 10, borderRadius: 8, marginBottom: 12 }}
          />
          <Pressable disabled={loading || !email} onPress={start} style={{ backgroundColor: colors.accent, padding: 12, borderRadius: 8, opacity: loading || !email ? 0.6 : 1 }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>{loading ? 'Sending...' : 'Send code'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ color: colors.secondaryText, marginBottom: 6 }}>Verification code</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
            placeholder="123456"
            placeholderTextColor={colors.secondaryText}
            style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, padding: 10, borderRadius: 8, marginBottom: 12 }}
          />
          <Pressable disabled={loading || code.length < 4} onPress={verify} style={{ backgroundColor: colors.accent, padding: 12, borderRadius: 8, opacity: loading || code.length < 4 ? 0.6 : 1 }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>{loading ? 'Verifying...' : 'Verify'}</Text>
          </Pressable>
        </>
      )}
      <View style={{ marginTop: 16 }}>
        <Link href="/(auth)/sign-up" style={{ color: colors.accent, textAlign: 'center', fontWeight: '600' }}>
          Don&apos;t have an account? Sign up
        </Link>
        <View style={{ height: 8 }} />
        <Link href="/(auth)/sign-in-password" style={{ color: colors.accent, textAlign: 'center' }}>
          Prefer password? Use email + password
        </Link>
      </View>
    </View>
  );
}
