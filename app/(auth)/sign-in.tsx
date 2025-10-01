import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { useTheme } from '@/components/common/ThemeProvider';
import { useSignIn } from '@clerk/clerk-expo';

export default function SignInScreen() {
  const { colors } = useTheme();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email'|'code'>('email');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const start = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);
    try {
      await signIn.create({ identifier: email });
      await signIn.prepareFirstFactor({ strategy: 'email_code' });
      setStep('code');
    } catch (e: any) {
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
      const attempt = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
      } else {
        setError('Invalid code');
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background, justifyContent: 'center' }}>
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
    </View>
  );
}
