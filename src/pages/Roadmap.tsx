import { useMemo } from 'react'
import { FeedbackPrompt } from '../components/Feedback'
import { Card, Page } from '../components/Page'
import { useProfile } from '../lib/auth'
import { useCompanies } from '../lib/companies'
import { roadmapFor } from '../lib/prep'
import { useApp } from '../lib/store'

export default function Roadmap() {
  const { roadmapDone, toggleRoadmap } = useApp()
  const profile = useProfile()
  const { companies } = useCompanies()
  // Software tracks keep the DSA and system-design plan; every other track gets one built from its own skill gaps.
  const phases = useMemo(() => roadmapFor(profile, companies), [profile, companies])
  const done = Object.fromEntries(roadmapDone.map((i) => [i, true])) as Record<string, boolean>
  const all = phases.flatMap((p) => p.items)
  const pct = all.length ? Math.round((all.filter((i) => done[i]).length / all.length) * 100) : 0

  return (
    <Page title="Learning Roadmap" subtitle="A 12-week plan generated from your skill gaps and target companies.">
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-[12.5px] font-medium text-ink-soft">Overall progress</p>
            <span className="mt-2 block h-[8px] overflow-hidden rounded-full bg-[#eef0f3]">
              <span className="block h-full w-full origin-left rounded-full bg-brand transition-transform duration-300 ease-out" style={{ transform: `scaleX(${Math.max(0, Math.min(100, pct)) / 100})` }} />
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
                  onChange={() => toggleRoadmap(i)}
                  className="h-[15px] w-[15px] accent-[#6d4aff]"
                />
                <span className={`text-[12.5px] ${done[i] ? 'text-ink-faint line-through' : 'text-ink-soft'}`}>{i}</span>
              </label>
            ))}
          </div>
        </Card>
      ))}
      <FeedbackPrompt target="roadmap" label="Is this roadmap useful for you?" />
    </Page>
  )
}
