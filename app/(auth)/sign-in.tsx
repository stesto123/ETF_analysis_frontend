import React from 'react'
import { useSignIn } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/components/common/ThemeProvider'

export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()
  const { colors, isDark } = useTheme()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (__DEV__) {
    const pk = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
    console.log('CLERK PK', pk ? pk.slice(0, 12) : '(missing)')
  }

  const onSignInPress = async () => {
    if (!isLoaded || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      })
      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId })
        router.replace('/')
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2))
        setError('Additional steps required to sign in.')
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || 'Failed to sign in.'
      setError(msg)
      console.error('Sign in error:', JSON.stringify(err?.errors || err, null, 2))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Sign in to continue</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={emailAddress}
                placeholder="you@example.com"
                placeholderTextColor={colors.secondaryText}
                onChangeText={setEmailAddress}
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Password</Text>
              <TextInput
                value={password}
                placeholder="••••••••"
                placeholderTextColor={colors.secondaryText}
                secureTextEntry
                onChangeText={setPassword}
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              />
            </View>

            {!!error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}

            <TouchableOpacity
              onPress={onSignInPress}
              disabled={!isLoaded || submitting || !emailAddress || !password}
              style={[styles.primaryBtn, { backgroundColor: colors.accent, opacity: (!isLoaded || submitting || !emailAddress || !password) ? 0.7 : 1 }]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign in</Text>
              )}
            </TouchableOpacity>

            <View style={styles.bottomRow}>
              <Text style={[styles.bottomText, { color: colors.secondaryText }]}>Don't have an account?</Text>
              <Link href="/(auth)/sign-up">
                <Text style={[styles.linkText, { color: colors.accent }]}>Sign up</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 10, default: 12 }),
    fontSize: 16,
  },
  primaryBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bottomRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  bottomText: { fontSize: 14 },
  linkText: { fontSize: 14, fontWeight: '600' },
  errorText: { marginTop: 6, marginBottom: 2, fontSize: 14 },
})