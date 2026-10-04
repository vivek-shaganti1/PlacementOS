import { Card, Page, Stat } from '../components/Page'
import { useApp } from '../lib/store'

const slots = [
  { id: 's1', type: 'DSA Round', mentor: 'Rahul Reddy · SDE II, Google', when: 'Tomorrow, 6:00 PM' },
  { id: 's2', type: 'System Design', mentor: 'Sneha Priya · SWE, Google', when: 'Thu, 7:30 PM' },
  { id: 's3', type: 'HR & Behavioural', mentor: 'Vikram Singh · SDE, Google', when: 'Sat, 11:00 AM' },
  { id: 's4', type: 'Full Loop Simulation', mentor: 'Ananya Sharma · SWE, Google', when: 'Sun, 4:00 PM' },
]

const past = [
  { type: 'DSA Round', date: '28 Aug', score: 7.5, note: 'Strong on arrays; slow on graph traversal.' },
  { type: 'System Design', date: '21 Aug', score: 6.0, note: 'Missed caching and read/write split.' },
  { type: 'HR & Behavioural', date: '14 Aug', score: 8.5, note: 'Clear structure, good ownership stories.' },
]

export default function MockInterviews() {
  const { bookings: booked, toggleBooking } = useApp()

  return (
    <Page title="Mock Interviews" subtitle="Book a rehearsal with alumni before the real loop.">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Interviews completed" value={`${past.length}`} sub="Last 30 days" />
        <Stat label="Average score" value="7.3 / 10" sub="+0.8 vs last month" tone="text-[#0d9a5b]" />
        <Stat label="Upcoming" value={`${booked.length}`} sub="Booked sessions" tone="text-brand-dark" />
      </div>

      <Card title="Available slots">
        <div className="divide-y divide-line">
          {slots.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-3">
              <div className="flex-1">
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

      <Card title="Past feedback">
        <div className="divide-y divide-line">
          {past.map((p) => (
            <div key={p.type} className="flex items-center gap-3 py-3">
              <span className="w-[150px] text-[12.5px] font-semibold text-ink">{p.type}</span>
              <span className="w-[70px] text-[11.5px] text-ink-faint">{p.date}</span>
              <span className="flex-1 text-[11.5px] text-ink-mute">{p.note}</span>
              <span className={`text-[13px] font-bold ${p.score >= 7.5 ? 'text-[#0d9a5b]' : 'text-[#d97706]'}`}>{p.score.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  )
}
