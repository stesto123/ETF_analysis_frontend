import { apiService } from '@/services/api'
import * as React from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSignUp } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { useTheme } from '@/components/common/ThemeProvider'

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()
  const { colors } = useTheme()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [pendingVerification, setPendingVerification] = React.useState(false)
  const [code, setCode] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const onSignUpPress = async () => {
    if (!isLoaded || submitting) return
    setError(null)
    const email = emailAddress.trim()
    const pass = password
    if (!email || !pass) {
      setError('Please enter email and password')
      return
    }
    setSubmitting(true)
    try {
      await signUp.create({ emailAddress: email, password: pass })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setPendingVerification(true)
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || 'Failed to start sign up.'
      setError(msg)
      console.error('SignUp create error:', JSON.stringify(err?.errors || err, null, 2))
    } finally {
      setSubmitting(false)
    }
  }

  const onVerifyPress = async () => {
    if (!isLoaded || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const email = emailAddress.trim()
      const signUpAttempt = await signUp.attemptEmailAddressVerification({ code })
      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId })
        try {
          await apiService.ensureUserProfile({ email, username: email.split('@')[0] })
        } catch (syncErr) {
          console.warn('User sync failed after sign-up', syncErr)
        }
        router.replace('/')
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2))
        setError('Additional steps required to complete sign up.')
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || 'Invalid or expired code.'
      setError(msg)
      console.error('SignUp verify error:', JSON.stringify(err?.errors || err, null, 2))
    } finally {
      setSubmitting(false)
    }
  }

  const onResendCode = async () => {
    if (!isLoaded || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || 'Failed to resend code.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (pendingVerification) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text }]}>Check your inbox</Text>
              <Text style={[styles.subtitle, { color: colors.secondaryText }]}>We sent you a 6-digit code</Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.secondaryText }]}>Verification code</Text>
                <TextInput
                  value={code}
                  placeholder="123456"
                  placeholderTextColor={colors.secondaryText}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, letterSpacing: 6, textAlign: 'center' }]}
                />
              </View>

              {!!error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}

              <TouchableOpacity
                onPress={onVerifyPress}
                disabled={!isLoaded || submitting || code.length < 6}
                style={[styles.primaryBtn, { backgroundColor: colors.accent, opacity: (!isLoaded || submitting || code.length < 6) ? 0.7 : 1 }]}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={onResendCode} disabled={submitting} style={styles.linkBtn}>
                <Text style={[styles.linkText, { color: colors.accent }]}>Resend code</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Start your ETF analytics journey</Text>

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
                placeholder="At least 8 characters"
                placeholderTextColor={colors.secondaryText}
                secureTextEntry
                onChangeText={setPassword}
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              />
            </View>

            {!!error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}

            <TouchableOpacity
              onPress={onSignUpPress}
              disabled={!isLoaded || submitting || !emailAddress || !password}
              style={[styles.primaryBtn, { backgroundColor: colors.accent, opacity: (!isLoaded || submitting || !emailAddress || !password) ? 0.7 : 1 }]}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Continue</Text>}
            </TouchableOpacity>

            <View style={styles.bottomRow}>
              <Text style={[styles.bottomText, { color: colors.secondaryText }]}>Already have an account?</Text>
              <Link href="/(auth)/sign-in">
                <Text style={[styles.linkText, { color: colors.accent }]}>Sign in</Text>
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
  card: { borderWidth: 1, borderRadius: 12, padding: 20 },
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
  primaryBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bottomRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  bottomText: { fontSize: 14 },
  linkText: { fontSize: 14, fontWeight: '600' },
  linkBtn: { alignItems: 'center', marginTop: 12 },
  errorText: { marginTop: 6, marginBottom: 2, fontSize: 14 },
})