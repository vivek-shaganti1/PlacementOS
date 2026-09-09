import { useState } from 'react'
import { Card, Page } from '../components/Page'

const phases = [
  { title: 'Phase 1 · Advanced DSA', weeks: 'Weeks 1-4', items: ['Graphs: BFS, DFS, Dijkstra, union-find', 'Dynamic programming patterns', 'Tries and segment trees', '150 curated problems'] },
  { title: 'Phase 2 · System Design', weeks: 'Weeks 5-7', items: ['Scaling fundamentals & CAP', 'Caching, queues, sharding', 'Design: URL shortener, feed, chat', 'Write 3 design docs'] },
  { title: 'Phase 3 · Projects & Impact', weeks: 'Weeks 8-10', items: ['Ship one distributed-systems project', 'Add metrics and load tests', 'Quantify impact on the resume'] },
  { title: 'Phase 4 · Interview Loop', weeks: 'Weeks 11-12', items: ['2 mock interviews per week', 'Behavioural story bank', 'Company-specific question sets'] },
]

export default function Roadmap() {
  const [done, setDone] = useState<Record<string, boolean>>({})
  const all = phases.flatMap((p) => p.items)
  const pct = Math.round((all.filter((i) => done[i]).length / all.length) * 100)

  return (
    <Page title="Learning Roadmap" subtitle="A 12-week plan generated from your skill gaps and target companies.">
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-[12.5px] font-medium text-ink-soft">Overall progress</p>
            <span className="mt-2 block h-[8px] overflow-hidden rounded-full bg-[#eef0f3]">
              <span className="block h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </span>
          </div>
          <p className="text-[22px] font-bold text-brand-dark">{pct}%</p>
        </div>
      </Card>

      {phases.map((p) => (
        <Card key={p.title} title={p.title} action={<span className="text-[11.5px] text-ink-faint">{p.weeks}</span>}>
          <div className="space-y-2">
            {p.items.map((i) => (
              <label key={i} className="flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2 py-1.5 hover:bg-[#f7f8fa]">
                <input
                  type="checkbox"
                  checked={!!done[i]}
                  onChange={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
                  className="h-[15px] w-[15px] accent-[#6d4aff]"
                />
                <span className={`text-[12.5px] ${done[i] ? 'text-ink-faint line-through' : 'text-ink-soft'}`}>{i}</span>
              </label>
            ))}
          </div>
        </Card>
      ))}
    </Page>
  )
}
