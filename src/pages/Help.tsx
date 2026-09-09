import { useState } from 'react'
import { Card, Page } from '../components/Page'
import { useApp } from '../lib/store'

const faqs = [
  ['How is my eligibility calculated?', 'PlacementIQ scores your academics, skills, experience and projects against each company\'s published criteria, then buckets the company into one of four stacks. The match percentage is the weighted average of those four sub-scores.'],
  ['Why am I "Nearly Eligible" for a company?', 'You meet most criteria but miss one or two — usually a skill depth or a specific round requirement. Open the company and check the Eligibility Criteria tab to see exactly which row is marked as a gap.'],
  ['Can I move from "Can Become Eligible" to "Eligible"?', 'Yes. Follow the generated Learning Roadmap; each completed phase re-scores your profile and can move companies between stacks.'],
  ['How often is company data refreshed?', 'Drive data, CTC ranges and criteria are refreshed whenever the placement cell updates them, and at least once per recruitment season.'],
  ['Who can see my profile?', 'By default only your placement cell and college alumni. You can change this under Settings → Profile visibility.'],
]

export default function Help() {
  const [open, setOpen] = useState<string | null>(faqs[0][0])
  const { openAssistant } = useApp()

  return (
    <Page title="Help & Support" subtitle="Answers to the questions students ask most.">
      <Card title="Frequently asked questions">
        <div className="divide-y divide-line">
          {faqs.map(([q, a]) => (
            <div key={q} className="py-1">
              <button onClick={() => setOpen(open === q ? null : q)} className="flex w-full items-center justify-between py-2.5 text-left">
                <span className="text-[12.5px] font-medium text-ink">{q}</span>
                <span className="text-[16px] text-ink-faint">{open === q ? '−' : '+'}</span>
              </button>
              {open === q && <p className="pb-3 pr-8 text-[12px] leading-[1.65] text-ink-mute">{a}</p>}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Still stuck?">
        <div className="flex items-center gap-3">
          <p className="flex-1 text-[12.5px] text-ink-mute">
            Reach the placement cell at <b className="text-ink">placements@college.edu</b>, or ask the AI assistant anything about your profile.
          </p>
          <button onClick={() => openAssistant()} className="rounded-[9px] border border-[#d5cbff] bg-white px-4 py-2 text-[12.5px] font-semibold text-brand-dark hover:bg-[#faf8ff]">
            Ask AI Assistant
          </button>
        </div>
      </Card>
    </Page>
  )
}
