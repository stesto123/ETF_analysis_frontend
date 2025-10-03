import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useSignUp } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useTheme } from '@/components/common/ThemeProvider';

export default function SignUpPasswordScreen() {
  const { colors } = useTheme();
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    setError(null);
    setLoading(true);
    try {
      await signUp.create({ emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;
    setError(null);
    setLoading(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)');
      } else {
        setError('Invalid code');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background, justifyContent: 'center' }}>
      {pendingVerification ? (
        <>
          <Text style={{ color: colors.text, fontSize: 24, marginBottom: 16 }}>Verify your email</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Enter verification code"
            placeholderTextColor={colors.secondaryText}
            style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, padding: 10, borderRadius: 8, marginBottom: 12 }}
          />
          <TouchableOpacity onPress={onVerifyPress} disabled={loading || code.length < 4} style={{ backgroundColor: colors.accent, padding: 12, borderRadius: 8, opacity: loading || code.length < 4 ? 0.6 : 1 }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>{loading ? 'Verifying…' : 'Verify'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ color: colors.text, fontSize: 24, marginBottom: 16 }}>Sign up</Text>
          <TextInput
            autoCapitalize="none"
            value={emailAddress}
            placeholder="Enter email"
            placeholderTextColor={colors.secondaryText}
            onChangeText={setEmailAddress}
            style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, padding: 10, borderRadius: 8, marginBottom: 12 }}
          />
          <TextInput
            value={password}
            placeholder="Enter password"
            placeholderTextColor={colors.secondaryText}
            secureTextEntry
            onChangeText={setPassword}
            style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, padding: 10, borderRadius: 8, marginBottom: 12 }}
          />
          <TouchableOpacity onPress={onSignUpPress} disabled={loading || !emailAddress || password.length < 6} style={{ backgroundColor: colors.accent, padding: 12, borderRadius: 8, opacity: loading || !emailAddress || password.length < 6 ? 0.6 : 1 }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>{loading ? 'Continuing…' : 'Continue'}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            <Text style={{ color: colors.secondaryText }}>Already have an account?</Text>
            <Link href="/(auth)/sign-in-password" asChild>
              <Text style={{ color: colors.accent }}>Sign in</Text>
            </Link>
          </View>
          {error && <Text style={{ color: 'tomato', marginTop: 8 }}>{error}</Text>}
        </>
      )}
    </View>
  );
}
