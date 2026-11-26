import { useMemo } from 'react'
import { placementScore, type ScorePart } from '../lib/predict'
import { evidenceSkills } from '../lib/trust'
import type { Profile } from '../lib/types'
import { Card, Ring } from './Page'

const SOURCE: Record<ScorePart['source'], { label: string; cls: string }> = {
  college: { label: 'College records', cls: 'bg-[#ecfdf3] text-[#067647]' },
  evidence: { label: 'Proven', cls: 'bg-[#ecfdf3] text-[#067647]' },
  mixed: { label: 'Partly proven', cls: 'bg-[#eef6ff] text-[#175cd3]' },
  resume: { label: 'Resume analysis', cls: 'bg-[#eef6ff] text-[#175cd3]' },
  self: { label: 'Self-reported', cls: 'bg-[#fff8ec] text-[#93370d]' },
}

/** The Placement score: everything a campus process looks at, out of 100, each part with its source and next step. */
export function PlacementScoreCard({ student }: { student: Profile }) {
  const s = useMemo(() => placementScore(student, evidenceSkills(student, student.credentials ?? [])), [student])
  const open = s.parts.filter((p) => p.next).sort((a, b) => b.points * (100 - b.value) - a.points * (100 - a.value))
  return (
    <Card title="Placement score" action={<span className="text-[11.5px] text-ink-mute">Out of 100, from your own profile</span>}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center gap-3 text-center">
          <Ring value={s.score} size={140} stroke={12} label="Placement score" sub={`${s.parts.filter((p) => p.value >= 100).length} of ${s.parts.length} parts full`} />
          {open[0] && <p className="text-[12.5px] leading-[1.5] text-ink-soft"><b className="text-ink">Biggest gain:</b> {open[0].next}</p>}
        </div>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {s.parts.map((p) => (
            <li key={p.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-semibold text-ink">{p.label}</span>
                <span className="shrink-0 font-mono text-[12px] text-ink-soft">{p.earned}<span className="text-ink-mute"> / {p.points}</span></span>
              </div>
              <div className="mt-1 h-[6px] overflow-hidden rounded-full bg-[oklch(0.92_0.015_285)]" role="img" aria-label={`${p.label}: ${p.value} of 100`}>
                <div className="h-full rounded-full bg-gradient-to-r from-[#6d4aff] to-[#38a9f0]" style={{ width: `${p.value}%` }} />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] leading-[1.45] text-ink-mute">
                <span className={`rounded-full px-1.5 py-px text-[10.5px] font-semibold ${SOURCE[p.source].cls}`}>{SOURCE[p.source].label}</span>
                <span className="min-w-0">{p.basis}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-[11.5px] leading-[1.5] text-ink-mute">
        Each part is a fixed formula of your own data. "Self-reported" parts are your own entries; rankings that placement cells and recruiters see use only proven evidence and college records.
      </p>
    </Card>
  )
}
