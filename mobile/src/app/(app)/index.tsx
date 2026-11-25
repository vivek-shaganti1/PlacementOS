import { useMemo, useState } from 'react'
import { RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, text } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { evaluateAll, predictSalary, readinessOf, type Bucket } from '@/lib/shared'
import { bucketMeta, colors } from '@/lib/theme'

const ORDER: Bucket[] = ['eligible', 'nearly', 'canBecome', 'notEligible']

export default function Readiness() {
  const { profile, error, refresh } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  // The website's own scoring, run on the phone: same companies, same rules, same numbers.
  const companies = useMemo(() => (profile ? evaluateAll(profile) : []), [profile])
  const readiness = useMemo(() => readinessOf(companies), [companies])
  const salary = useMemo(() => predictSalary(companies), [companies])
  const onRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}>
        <Text accessibilityRole="header" style={text.h1}>{profile ? `Hi, ${profile.full_name.split(' ')[0] || 'there'}` : 'Readiness'}</Text>
        {error && <Text accessibilityRole="alert" style={{ color: colors.bad }}>{error}</Text>}
        {profile && (
          <>
            <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
              <Text style={text.mute}>Placement readiness</Text>
              <Text accessibilityLabel={`Readiness ${readiness} out of 100`} style={{ fontSize: 56, fontWeight: '700', color: colors.ink, letterSpacing: -2 }}>{readiness}</Text>
              <Text style={text.mute}>{salary.reachable ? `Expected CTC ₹${salary.expected.toFixed(1)} LPA` : 'Expected CTC: shown once a company is within reach'}</Text>
            </Card>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {ORDER.map((b) => (
                <View key={b} style={{ flexGrow: 1, flexBasis: '45%', backgroundColor: bucketMeta[b].tint, borderRadius: 16, padding: 14 }}>
                  <Text style={{ fontSize: 26, fontWeight: '700', color: bucketMeta[b].color }}>{companies.filter((c) => c.bucket === b).length}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: bucketMeta[b].color }}>{bucketMeta[b].label}</Text>
                </View>
              ))}
            </View>
            <Text accessibilityRole="header" style={[text.h2, { marginTop: 6 }]}>Closest companies</Text>
            {companies.slice(0, 12).map((c) => (
              <Card key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={text.h2}>{c.name}</Text>
                  <Text style={text.mute}>{c.gaps.length ? `Next: ${c.gaps[0].skill} ${c.gaps[0].have} → ${c.gaps[0].need}` : c.role}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: bucketMeta[c.bucket].color }}>{c.match}%</Text>
                  <Text style={{ fontSize: 12, color: bucketMeta[c.bucket].color }}>{bucketMeta[c.bucket].label}</Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
