import { useState } from 'react'
import { Card, Page, Stat } from '../components/Page'
import { useAuth, useProfile } from '../lib/auth'
import { useApp } from '../lib/store'
import { errMsg } from '../lib/supabase'

const types = ['DSA Round', 'System Design', 'HR & Behavioural', 'Full Loop Simulation', 'Company OA']
const input = 'h-[34px] rounded-[9px] border border-line bg-white px-3 text-[12.5px] outline-none focus:border-[#d5cbff]'

const slots = [
  { id: 's1', type: 'DSA Round', mentor: 'Alumni mentor · SDE II, product company', when: 'Tomorrow, 6:00 PM' },
  { id: 's2', type: 'System Design', mentor: 'Alumni mentor · Senior SWE', when: 'Thu, 7:30 PM' },
  { id: 's3', type: 'HR & Behavioural', mentor: 'Placement cell · HR panel', when: 'Sat, 11:00 AM' },
  { id: 's4', type: 'Full Loop Simulation', mentor: 'Alumni panel · 3 interviewers', when: 'Sun, 4:00 PM' },
]

export default function MockInterviews() {
  const { bookings: booked, toggleBooking, showToast } = useApp()
  const p = useProfile()
  const { updateProfile } = useAuth()
  const past = p.mock_feedback
  const [d, setD] = useState({ type: types[0], score: '7', note: '' })
  const avg = past.length ? past.reduce((a, x) => a + x.score, 0) / past.length : null
  const last30 = past.filter((x) => Date.now() - new Date(x.date).getTime() < 30 * 86400000).length

  const log = async () => {
    const score = Number(d.score)
    if (!(score >= 0 && score <= 10)) return showToast('Score must be between 0 and 10.')
    try {
      await updateProfile({ mock_feedback: [{ type: d.type, score, note: d.note.trim(), date: new Date().toISOString() }, ...past] })
      setD({ ...d, note: '' })
      showToast('Feedback logged.')
    } catch (e) {
      showToast(errMsg(e))
    }
  }

  return (
    <Page title="Mock Interviews" subtitle="Book a rehearsal with alumni before the real loop.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Interviews completed" value={`${past.length}`} sub={`${last30} in the last 30 days`} />
        <Stat label="Average score" value={avg === null ? '—' : `${avg.toFixed(1)} / 10`} sub="From your logged feedback" tone="text-[#0d9a5b]" />
        <Stat label="Upcoming" value={`${booked.length}`} sub="Booked sessions" tone="text-brand-dark" />
      </div>

      <Card title="Available slots">
        <div className="divide-y divide-line">
          {slots.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <div className="min-w-[180px] flex-1">
                <p className="text-[12.5px] font-semibold text-ink">{s.type}</p>
                <p className="text-[11.5px] text-ink-mute">{s.mentor}</p>
              </div>
              <span className="text-[12px] text-ink-soft">{s.when}</span>
              <button
                onClick={() => toggleBooking(s.id)}
                className={`w-[92px] rounded-[9px] border py-[7px] text-[12px] font-semibold ${
                  booked.includes(s.id) ? 'border-[#c9f0d9] bg-[#ecfdf3] text-[#0d9a5b]' : 'border-[#d5cbff] text-brand-dark hover:bg-[#faf8ff]'
                }`}
              >
                {booked.includes(s.id) ? 'Booked ✓' : 'Book slot'}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Your feedback log">
        <div className="flex flex-wrap gap-2">
          <select value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })} className={input}>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
          <input type="number" min={0} max={10} step={0.5} value={d.score} onChange={(e) => setD({ ...d, score: e.target.value })} className={`${input} w-[80px]`} aria-label="Score out of 10" />
          <input value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="What went well / what to fix" className={`${input} w-full min-w-0 sm:w-auto sm:min-w-[240px] sm:flex-1`} />
          <button onClick={log} className="rounded-[9px] bg-brand px-4 text-[12.5px] font-semibold text-white hover:bg-brand-dark">Log</button>
        </div>
        <div className="mt-2 divide-y divide-line">
          {past.map((x, i) => (
            <div key={x.date + i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
              <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-ink sm:w-[150px] sm:flex-none">{x.type}</span>
              <span className="w-[70px] text-[11.5px] text-ink-faint">{new Date(x.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
              <span className="order-last w-full text-[11.5px] text-ink-mute sm:order-none sm:w-auto sm:flex-1">{x.note}</span>
              <span className={`text-[13px] font-bold ${x.score >= 7.5 ? 'text-[#0d9a5b]' : 'text-[#d97706]'}`}>{x.score.toFixed(1)}</span>
            </div>
          ))}
          {past.length === 0 && <p className="py-4 text-center text-[12px] text-ink-faint">After each mock interview, log your score and notes here to track progress.</p>}
        </div>
      </Card>
    </Page>
  )
}
