import { Ionicons } from '@expo/vector-icons'
import { Redirect, Tabs } from 'expo-router'
import { ActivityIndicator, Linking, Text, View } from 'react-native'
import { Button, text } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { API_URL } from '@/lib/config'
import { colors } from '@/lib/theme'

/** A full-screen message for accounts the app does not serve yet, with a way out. */
function Notice({ title, body }: { title: string; body: string }) {
  const { signOut } = useAuth()
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 14, backgroundColor: colors.bg }}>
      <Text accessibilityRole="header" style={text.h1}>{title}</Text>
      <Text style={text.body}>{body}</Text>
      <Button title="Open the website" onPress={() => void Linking.openURL(`${API_URL}/login`)} />
      <Button title="Sign out" kind="quiet" onPress={() => void signOut()} />
    </View>
  )
}

export default function AppLayout() {
  const { session, loading, role, mustChangePassword } = useAuth()
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}><ActivityIndicator color={colors.brand} /></View>
  if (!session) return <Redirect href="/sign-in" />
  if (mustChangePassword) return <Notice title="Choose your password first" body="Your college gave you a temporary password. Replace it on the website, then sign in here." />
  // Admin consoles need two-factor sign-in and wide screens; they stay on the website for now.
  if (role !== 'student') return <Notice title="Use the website for this account" body="The app is for students for now. Placement cell, recruiter and platform accounts work on the website." />
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brandDark, tabBarInactiveTintColor: colors.inkMute, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Readiness', tabBarIcon: ({ focused, size }) => <Ionicons name="speedometer-outline" color={focused ? colors.brandDark : colors.inkMute} size={size} /> }} />
      <Tabs.Screen name="drives" options={{ title: 'Drives', tabBarIcon: ({ focused, size }) => <Ionicons name="briefcase-outline" color={focused ? colors.brandDark : colors.inkMute} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ focused, size }) => <Ionicons name="person-circle-outline" color={focused ? colors.brandDark : colors.inkMute} size={size} /> }} />
    </Tabs>
  )
}
