import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type ChatMsg = { role: 'user' | 'bot'; text: string }

type Ctx = {
  saved: string[]
  applied: string[]
  toggleSave: (id: string) => void
  apply: (id: string) => void
  assistantOpen: boolean
  openAssistant: (seed?: string) => void
  closeAssistant: () => void
  chat: ChatMsg[]
  send: (text: string) => void
}

const AppCtx = createContext<Ctx | null>(null)

const canned = (q: string) => {
  const t = q.toLowerCase()
  if (t.includes('roadmap') || t.includes('prepare'))
    return 'Start with Advanced DSA (graphs, DP, tries) for 4 weeks, then System Design fundamentals for 3 weeks. Ship one distributed-systems project and do 2 mock interviews per week. That path moves you from 92% to interview-ready for top product companies.'
  if (t.includes('message') || t.includes('intro'))
    return 'Suggested message: "Hi — I am a final-year CSE student from your college. I am preparing for the upcoming SDE drive and would value 10 minutes of your advice on what the interview loop focuses on. Thank you!"'
  if (t.includes('resume'))
    return 'Your resume scores 82/100. Biggest wins: quantify impact on all three projects, move skills above education, and cut the objective statement.'
  if (t.includes('skill') || t.includes('gap'))
    return 'Your largest gaps are System Design (62%) and Cloud & DevOps (51%). Closing System Design alone unlocks 9 more companies in the "Can Become Eligible" stack.'
  return 'Based on your profile — CGPA 8.6, no backlogs, 2 internships and strong frontend skills — you are eligible for 18 companies today and within reach of 14 more. Ask me about any specific company, skill or round.'
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<string[]>([])
  const [applied, setApplied] = useState<string[]>([])
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [chat, setChat] = useState<ChatMsg[]>([
    { role: 'bot', text: 'Hi Arjun! I am your AI Career Assistant. Ask me about eligibility, skills, companies or interview prep.' },
  ])

  const value = useMemo<Ctx>(
    () => ({
      saved,
      applied,
      toggleSave: (id) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
      apply: (id) => setApplied((a) => (a.includes(id) ? a : [...a, id])),
      assistantOpen,
      openAssistant: (seed) => {
        setAssistantOpen(true)
        if (seed) {
          setChat((c) => [...c, { role: 'user', text: seed }, { role: 'bot', text: canned(seed) }])
        }
      },
      closeAssistant: () => setAssistantOpen(false),
      chat,
      send: (text) => setChat((c) => [...c, { role: 'user', text }, { role: 'bot', text: canned(text) }]),
    }),
    [saved, applied, assistantOpen, chat],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const v = useContext(AppCtx)
  if (!v) throw new Error('useApp must be used inside AppProvider')
  return v
}
