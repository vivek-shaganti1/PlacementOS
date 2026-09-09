import { useState } from 'react'
import { Card, Page, Stat } from '../components/Page'

const sets = [
  { topic: 'Arrays & Strings', solved: 48, total: 60, level: 'Easy-Medium' },
  { topic: 'Linked Lists', solved: 22, total: 30, level: 'Medium' },
  { topic: 'Trees & Graphs', solved: 31, total: 55, level: 'Medium-Hard' },
  { topic: 'Dynamic Programming', solved: 18, total: 50, level: 'Hard' },
  { topic: 'SQL Queries', solved: 26, total: 35, level: 'Medium' },
  { topic: 'Aptitude & Logical', solved: 64, total: 80, level: 'Easy' },
]

const question = {
  q: 'Given an array of integers, return indices of the two numbers that add up to a target. Which approach gives O(n) time?',
  options: ['Sort then two pointers', 'Hash map of complements', 'Nested loops', 'Binary search per element'],
  answer: 1,
}

export default function Practice() {
  const [picked, setPicked] = useState<number | null>(null)
  const solved = sets.reduce((a, s) => a + s.solved, 0)
  const total = sets.reduce((a, s) => a + s.total, 0)

  return (
    <Page title="Practice Arena" subtitle="Targeted problem sets based on the rounds your companies actually run.">
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Problems solved" value={`${solved}`} sub={`of ${total} assigned`} />
        <Stat label="Current streak" value="9 days" sub="Personal best: 14" tone="text-[#0d9a5b]" />
        <Stat label="Avg. solve time" value="18 min" sub="Target: 15 min" />
        <Stat label="Accuracy" value="76%" sub="+4% this week" tone="text-brand-dark" />
      </div>

      <Card title="Problem sets">
        <div className="divide-y divide-line">
          {sets.map((s) => {
            const pct = Math.round((s.solved / s.total) * 100)
            return (
              <div key={s.topic} className="flex items-center gap-3 py-3">
                <span className="w-[180px] text-[12.5px] font-semibold text-ink">{s.topic}</span>
                <span className="w-[110px] text-[11.5px] text-ink-mute">{s.level}</span>
                <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-[#eef0f3]">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-[70px] text-right text-[11.5px] font-semibold text-ink-soft">{s.solved}/{s.total}</span>
                <button className="rounded-md border border-line px-3 py-1.5 text-[11.5px] font-medium text-ink-soft hover:bg-[#f7f8fa]">Practice</button>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="Question of the day">
        <p className="text-[12.5px] text-ink-soft">{question.q}</p>
        <div className="mt-3 space-y-2">
          {question.options.map((o, i) => {
            const state = picked === null ? '' : i === question.answer ? 'border-[#c9f0d9] bg-[#ecfdf3] text-[#0d9a5b]' : picked === i ? 'border-[#fbd5d1] bg-[#fef3f2] text-[#d92d20]' : ''
            return (
              <button key={o} onClick={() => setPicked(i)} className={`block w-full rounded-[9px] border px-3 py-2 text-left text-[12.5px] transition ${state || 'border-line text-ink-soft hover:bg-[#f7f8fa]'}`}>
                {o}
              </button>
            )
          })}
        </div>
        {picked !== null && (
          <p className="mt-3 text-[12px] font-medium text-ink-mute">
            {picked === question.answer ? 'Correct — one pass with a hash map is O(n) time, O(n) space.' : 'Not quite. A hash map of complements solves it in a single O(n) pass.'}
          </p>
        )}
      </Card>
    </Page>
  )
}
