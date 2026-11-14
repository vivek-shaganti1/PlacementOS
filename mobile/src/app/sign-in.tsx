import { Redirect } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Linking, Platform, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Card, Field, text } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { API_URL } from '@/lib/config'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'

export default function SignIn() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (session) return <Redirect href="/" />

  const submit = async () => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    setBusy(false)
    // One message for a wrong email or a wrong password, so the form never confirms which accounts exist.
    if (error) setError(/invalid/i.test(error.message) ? 'That email and password do not match.' : 'Could not sign in. Check your connection and try again.')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <Text accessibilityRole="header" style={text.h1}>PlacementIQ</Text>
            <Text style={text.body}>Sign in with the account your college set up for you.</Text>
          </View>
          <Card style={{ gap: 14 }}>
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="email" keyboardType="email-address" textContentType="username" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
            {error && <Text accessibilityRole="alert" style={{ color: colors.bad, fontSize: 14 }}>{error}</Text>}
            <Button title="Sign in" onPress={submit} busy={busy} disabled={!email || !password} />
          </Card>
          <Text style={[text.mute, { textAlign: 'center' }]}>
            New here or forgot your password?{' '}
            <Text accessibilityRole="link" style={{ color: colors.brandDark, fontWeight: '600' }} onPress={() => void Linking.openURL(`${API_URL}/login`)}>Use the website</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
