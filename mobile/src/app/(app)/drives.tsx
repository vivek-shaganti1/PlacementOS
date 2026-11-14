import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, text } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { evaluateJob, istDay, type JobPosting } from '@/lib/shared'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'

type Drive = JobPosting & { applied: boolean }

export default function Drives() {
  const { profile, session } = useAuth()
  const [drives, setDrives] = useState<Drive[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!session) return
    // Row level security returns only this college's drives and this student's own applications.
    const [jobs, mine] = await Promise.all([
      supabase.from('job_postings').select('*').order('created_at', { ascending: false }),
      supabase.from('job_applications').select('job_id').eq('user_id', session.user.id),
    ])
    if (jobs.error) return setError('Could not load drives. Pull down to try again.')
    setError(null)
    const applied = new Set((mine.data ?? []).map((a) => a.job_id as string))
    setDrives((jobs.data ?? []).map((j) => ({ ...(j as JobPosting), min_cgpa: Number(j.min_cgpa), min_class_x: Number(j.min_class_x), min_class_xii: Number(j.min_class_xii), branches: j.branches ?? [], batches: j.batches ?? [], skill_requirements: j.skill_requirements ?? {}, applied: applied.has(j.id) })))
  }, [session])
  useEffect(() => {
    void load()
  }, [load])

  const today = istDay()
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <FlatList
        data={drives ?? []}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} tintColor={colors.brand} />}
        ListHeaderComponent={
          <View style={{ gap: 4, marginBottom: 4 }}>
            <Text accessibilityRole="header" style={text.h1}>Campus drives</Text>
            {error && <Text accessibilityRole="alert" style={{ color: colors.bad }}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={drives ? <Text style={text.body}>Your placement cell has not posted a drive yet.</Text> : undefined}
        renderItem={({ item }) => {
          const open = item.status === 'open' && (!item.deadline || item.deadline >= today)
          const ev = profile ? evaluateJob(item, profile) : null
          return (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={text.h2}>{item.company}</Text>
                  <Text style={text.mute}>{item.role}{item.location ? ` · ${item.location}` : ''}</Text>
                </View>
                {ev && <Text style={{ fontSize: 17, fontWeight: '700', color: ev.eligibleToApply ? colors.good : colors.bad }}>{ev.match}%</Text>}
              </View>
              <Text style={text.mute}>
                {item.applied ? 'You applied' : !open ? 'Closed' : ev && !ev.eligibleToApply ? 'You do not meet the mandatory criteria' : 'Open: apply on the website'}
                {item.deadline && open ? ` · Apply by ${new Date(`${item.deadline}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
              </Text>
            </Card>
          )
        }}
      />
    </SafeAreaView>
  )
}
