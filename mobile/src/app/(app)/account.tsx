import * as Updates from 'expo-updates'
import Constants from 'expo-constants'
import { Linking, ScrollView, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Card, text } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { API_URL } from '@/lib/config'

export default function Account() {
  const { profile, session, signOut } = useAuth()
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text accessibilityRole="header" style={text.h1}>Account</Text>
        <Card>
          <Text style={text.h2}>{profile?.full_name || 'Student'}</Text>
          <Text style={text.mute}>{session?.user.email}</Text>
          {profile && <Text style={text.mute}>{[profile.college, profile.branch, profile.batch].filter(Boolean).join(' · ')}</Text>}
        </Card>
        <Card>
          <Text style={text.body}>Edit your profile, upload a resume, connect coding accounts and apply to drives on the website.</Text>
          <Button title="Open the website" kind="quiet" onPress={() => void Linking.openURL(`${API_URL}/login`)} />
          <Button title="Privacy policy" kind="quiet" onPress={() => void Linking.openURL(`${API_URL}/privacy`)} />
        </Card>
        <Button title="Sign out" kind="danger" onPress={() => void signOut()} />
        <Text style={[text.mute, { textAlign: 'center' }]}>
          Version {Constants.expoConfig?.version ?? '?'}{Updates.updateId ? ` · update ${Updates.updateId.slice(0, 8)}` : ''}
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
