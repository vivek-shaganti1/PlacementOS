import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { callApi } from './api'
import { useAuth } from './auth'
import { errMsg, supabase, type Profile } from './supabase'

export type ChatMsg = { role: 'user' | 'bot'; text: string }
export type Application = { company_id: string; stage: number; created_at: string }
export type Notification = { id: number; text: string; link: string | null; read: boolean; created_at: string }
export type Attempt = { question_id: string; picked: number; correct: boolean; created_at: string }

type Ctx = {
  ready: boolean
  saved: string[]
  applied: string[]
  applications: Application[]
  toggleSave: (id: string) => void
  apply: (id: string) => void
  setStage: (id: string, stage: number) => void
  withdraw: (id: string) => void
  roadmapDone: string[]
  toggleRoadmap: (item: string) => void
  bookings: string[]
  toggleBooking: (slot: string) => void
  enrollments: string[]
  toggleEnrollment: (cert: string) => void
  attempts: Attempt[]
  recordAttempt: (questionId: string, picked: number, correct: boolean) => void
  notifications: Notification[]
  markRead: (id?: number) => void
  assistantOpen: boolean
  openAssistant: (seed?: string) => void
  closeAssistant: () => void
  chat: ChatMsg[]
  thinking: boolean
  send: (text: string) => void
  clearChat: () => void
  toast: string | null
  showToast: (msg: string) => void
}

const AppCtx = createContext<Ctx | null>(null)

const weakest = (p: Profile) => [...p.skills].sort((a, b) => a.level - b.level).slice(0, 2)

export const canned = (q: string, p: Profile) => {
  const t = q.toLowerCase()
  const [g1, g2] = weakest(p)
  if (t.includes('roadmap') || t.includes('prepare') || t.includes('plan'))
    return `Start with ${g1?.name ?? 'Advanced DSA'} for 4 weeks, then ${g2?.name ?? 'System Design'} for 3 weeks. Ship one distributed-systems project and do 2 mock interviews per week. Track it all on your Learning Roadmap page.`
  if (t.includes('message') || t.includes('intro'))
    return `Suggested message: "Hi — I am a ${p.meta} student from ${p.college}. I am preparing for the upcoming SDE drive and would value 10 minutes of your advice on what the interview loop focuses on. Thank you!"`
  if (t.includes('resume'))
    return p.resume_name
      ? `I have your resume "${p.resume_name}" on file. Biggest wins: quantify impact on every project, move skills above education, and cut the objective statement.`
      : 'Upload your resume on the Resume Analyzer page first. Then: quantify impact on every project, move skills above education, and cut the objective statement.'
  if (t.includes('skill') || t.includes('gap'))
    return `Your largest gaps are ${g1?.name} (${g1?.level}%) and ${g2?.name} (${g2?.level}%). Closing those moves the most companies up a stack.`
  return `Based on your profile — CGPA ${p.cgpa}, ${p.backlogs === 0 ? 'no' : p.backlogs} backlogs, ${p.internships.length} internship${p.internships.length === 1 ? '' : 's'} and ${p.skills.filter((s) => s.level >= 75).length} strong skills — ask me about any specific company, skill, round, your resume or a roadmap.`
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth()
  const uid = session!.user.id
  const firstName = (profile?.full_name || 'there').split(' ')[0]

  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState<string[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [roadmapDone, setRoadmapDone] = useState<string[]>([])
  const [bookings, setBookings] = useState<string[]>([])
  const [enrollments, setEnrollments] = useState<string[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [history, setHistory] = useState<ChatMsg[]>([])
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [thinking, setThinking] = useState(false)
  const historyRef = useRef<ChatMsg[]>([])
  historyRef.current = history
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number>()

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3500)
  }, [])

  const fail = useCallback((e: unknown) => showToast(`Could not save: ${errMsg(e)}`), [showToast])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [s, a, r, b, c, at, n, ch] = await Promise.all([
        supabase.from('saved_companies').select('company_id').order('created_at'),
        supabase.from('applications').select('company_id, stage, created_at').order('created_at'),
        supabase.from('roadmap_progress').select('item'),
        supabase.from('mock_bookings').select('slot_id'),
        supabase.from('cert_enrollments').select('cert_name'),
        supabase.from('practice_attempts').select('question_id, picked, correct, created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('notifications').select('id, text, link, read, created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('chat_messages').select('role, text').order('created_at').order('id').limit(200),
      ])
      if (!alive) return
      const firstErr = [s, a, r, b, c, at, n, ch].find((x) => x.error)?.error
      if (firstErr) showToast(`Could not load your data: ${firstErr.message}`)
      setSaved((s.data ?? []).map((x) => x.company_id))
      setApplications((a.data ?? []) as Application[])
      setRoadmapDone((r.data ?? []).map((x) => x.item))
      setBookings((b.data ?? []).map((x) => x.slot_id))
      setEnrollments((c.data ?? []).map((x) => x.cert_name))
      setAttempts((at.data ?? []) as Attempt[])
      setNotifications((n.data ?? []) as Notification[])
      setHistory((ch.data ?? []) as ChatMsg[])
      setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [uid, showToast])

  // Generic optimistic toggle for (user_id, key) membership tables.
  const toggleIn = useCallback(
    (
      list: string[],
      setList: (fn: (l: string[]) => string[]) => void,
      table: string,
      col: string,
      value: string,
    ) => {
      const has = list.includes(value)
      setList((l) => (has ? l.filter((x) => x !== value) : [...l, value]))
      const q = has
        ? supabase.from(table).delete().eq('user_id', uid).eq(col, value)
        : supabase.from(table).insert({ user_id: uid, [col]: value })
      q.then(({ error }) => {
        if (error) {
          setList((l) => (has ? [...l, value] : l.filter((x) => x !== value)))
          fail(error)
        }
      })
    },
    [uid, fail],
  )

  const persistChat = useCallback(
    (msgs: ChatMsg[]) => {
      setHistory((h) => [...h, ...msgs])
      supabase
        .from('chat_messages')
        .insert(msgs.map((m) => ({ user_id: uid, role: m.role, text: m.text.slice(0, 4000) })))
        .then(({ error }) => error && fail(error))
    },
    [uid, fail],
  )

  const ask = useCallback(
    async (text: string) => {
      if (!profile || thinking) return
      const userMsg: ChatMsg = { role: 'user', text }
      const convo = [...historyRef.current, userMsg]
      persistChat([userMsg])
      setThinking(true)
      let reply: string
      try {
        reply = (await callApi<{ reply: string }>('chat', { messages: convo.slice(-20) })).reply
      } catch (e) {
        showToast(`AI unavailable (${errMsg(e)}). Showing a quick answer instead.`)
        reply = canned(text, profile)
      } finally {
        setThinking(false)
      }
      persistChat([{ role: 'bot', text: reply }])
    },
    [profile, thinking, persistChat, showToast],
  )

  const chat = useMemo<ChatMsg[]>(
    () => [
      { role: 'bot', text: `Hi ${firstName}! I am your AI Career Assistant. Ask me about eligibility, skills, companies or interview prep.` },
      ...history,
    ],
    [history, firstName],
  )

  const value = useMemo<Ctx>(
    () => ({
      ready,
      saved,
      applied: applications.map((a) => a.company_id),
      applications,
      toggleSave: (id) => toggleIn(saved, setSaved, 'saved_companies', 'company_id', id),
      apply: (id) => {
        if (applications.some((a) => a.company_id === id)) return
        const row = { company_id: id, stage: 0, created_at: new Date().toISOString() }
        setApplications((a) => [...a, row])
        supabase
          .from('applications')
          .insert({ user_id: uid, company_id: id })
          .then(({ error }) => {
            if (error) {
              setApplications((a) => a.filter((x) => x.company_id !== id))
              fail(error)
            } else showToast('Application submitted. Track it under Applications.')
          })
      },
      setStage: (id, stage) => {
        const prev = applications.find((a) => a.company_id === id)?.stage
        setApplications((a) => a.map((x) => (x.company_id === id ? { ...x, stage } : x)))
        supabase
          .from('applications')
          .update({ stage })
          .eq('user_id', uid)
          .eq('company_id', id)
          .then(({ error }) => {
            if (error) {
              setApplications((a) => a.map((x) => (x.company_id === id ? { ...x, stage: prev ?? 0 } : x)))
              fail(error)
            }
          })
      },
      withdraw: (id) => {
        const prev = applications
        setApplications((a) => a.filter((x) => x.company_id !== id))
        supabase
          .from('applications')
          .delete()
          .eq('user_id', uid)
          .eq('company_id', id)
          .then(({ error }) => {
            if (error) {
              setApplications(prev)
              fail(error)
            }
          })
      },
      roadmapDone,
      toggleRoadmap: (item) => toggleIn(roadmapDone, setRoadmapDone, 'roadmap_progress', 'item', item),
      bookings,
      toggleBooking: (slot) => toggleIn(bookings, setBookings, 'mock_bookings', 'slot_id', slot),
      enrollments,
      toggleEnrollment: (cert) => toggleIn(enrollments, setEnrollments, 'cert_enrollments', 'cert_name', cert),
      attempts,
      recordAttempt: (question_id, picked, correct) => {
        setAttempts((a) => [{ question_id, picked, correct, created_at: new Date().toISOString() }, ...a])
        supabase
          .from('practice_attempts')
          .insert({ user_id: uid, question_id, picked, correct })
          .then(({ error }) => error && fail(error))
      },
      notifications,
      markRead: (id) => {
        setNotifications((n) => n.map((x) => (id === undefined || x.id === id ? { ...x, read: true } : x)))
        let q = supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false)
        if (id !== undefined) q = q.eq('id', id)
        q.then(({ error }) => error && fail(error))
      },
      assistantOpen,
      openAssistant: (seed) => {
        setAssistantOpen(true)
        if (seed) ask(seed)
      },
      closeAssistant: () => setAssistantOpen(false),
      chat,
      thinking,
      send: ask,
      clearChat: () => {
        setHistory([])
        supabase
          .from('chat_messages')
          .delete()
          .eq('user_id', uid)
          .then(({ error }) => error && fail(error))
      },
      toast,
      showToast,
    }),
    [ready, saved, applications, roadmapDone, bookings, enrollments, attempts, notifications, assistantOpen, chat, thinking, toast, uid, toggleIn, fail, ask, showToast],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const v = useContext(AppCtx)
  if (!v) throw new Error('useApp must be used inside AppProvider')
  return v
}
