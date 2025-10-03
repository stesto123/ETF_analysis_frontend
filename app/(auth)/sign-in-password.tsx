import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useTheme } from '@/components/common/ThemeProvider';

export default function SignInPasswordScreen() {
  const { colors } = useTheme();
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setError(null);
    setLoading(true);
    try {
      const attempt = await signIn.create({ identifier: emailAddress, password });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)');
      } else {
        setError('Further steps required');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background, justifyContent: 'center' }}>
      <Text style={{ color: colors.text, fontSize: 24, marginBottom: 16 }}>Sign in</Text>
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
      <TouchableOpacity onPress={onSignInPress} disabled={loading || !emailAddress || !password} style={{ backgroundColor: colors.accent, padding: 12, borderRadius: 8, opacity: loading || !emailAddress || !password ? 0.6 : 1 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>{loading ? 'Continuing…' : 'Continue'}</Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
        <Text style={{ color: colors.secondaryText }}>Don't have an account?</Text>
        <Link href="/(auth)/sign-up-password"><Text style={{ color: colors.accent }}>Sign up</Text></Link>
      </View>
      {error && <Text style={{ color: 'tomato', marginTop: 8 }}>{error}</Text>}
    </View>
  );
}
