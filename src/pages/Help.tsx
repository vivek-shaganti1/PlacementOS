import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Page } from '../components/Page'
import { useApp } from '../lib/store'

const faqs = [
  ['How is my eligibility calculated?', 'PlacementIQ scores your academics, skills, experience and projects against each company\'s criteria, then buckets the company into one of four stacks. The match percentage is the weighted average of those four sub-scores. Drives posted at your college use the criteria set for that drive; for other companies the criteria are typical campus estimates, not figures published by the company.'],
  ['Why am I "Nearly Eligible" for a company?', 'You meet most criteria but miss one or two — usually a skill depth or a specific round requirement. Open the company and check the Eligibility Criteria tab to see exactly which row is marked as a gap.'],
  ['Can I move from "Can Become Eligible" to "Eligible"?', 'Yes. Use the Learning Roadmap to plan, then add the proof of what you learned. Ticking off a roadmap phase does not change your score; companies move between stacks when your academics, skill levels or experience change.'],
  ['How often is company data refreshed?', 'Drives change whenever your placement cell or a recruiter updates them. The wider company list, including its CTC ranges and criteria, is built into PlacementIQ and changes only when the product is updated.'],
  ['Who can see my profile?', 'Your placement cell, and PlacementIQ platform administrators who run the service. Recruiters added by your college can see it only for drives you apply to. If you choose Private under Settings → Profile visibility they cannot open your profile, but they still see your application and its status.'],
  ['Do the skills I type count in rankings?', 'No. Skills, projects and internships you type are labelled self-reported. Rankings seen by placement cells and recruiters use evidence fetched from accounts you have proven are yours, confirmed credentials and your college\'s academic records.'],
  ['How do I delete my account?', 'Students can delete their own account in Settings. This removes your rows, files and roster entry. Admin and recruiter accounts are removed by a college or platform admin.'],
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
              <button
                onClick={() => setOpen(open === q ? null : q)}
                aria-expanded={open === q}
                aria-controls={`faq-${faqs.findIndex(([x]) => x === q)}`}
                className="flex w-full items-center justify-between py-2.5 text-left"
              >
                <span className="text-[12.5px] font-medium text-ink">{q}</span>
                <span aria-hidden className="text-[16px] text-ink-faint">{open === q ? '−' : '+'}</span>
              </button>
              {open === q && <p id={`faq-${faqs.findIndex(([x]) => x === q)}`} className="pb-3 pr-8 text-[12px] leading-[1.65] text-ink-mute">{a}</p>}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Still stuck?">
        <div className="flex items-center gap-3">
          <p className="flex-1 text-[12.5px] text-ink-mute">
            Contact your college's placement cell for anything about your account, roster entry or drives, or ask the AI assistant about your profile. For a complaint about how your data is handled, see <Link to="/privacy#contact" className="font-semibold text-ink hover:underline">Contact in the privacy policy</Link>.
          </p>
          <button onClick={() => openAssistant()} className="rounded-[9px] border border-[#d5cbff] bg-white px-4 py-2 text-[12.5px] font-semibold text-brand-dark hover:bg-[#faf8ff]">
            Ask AI Assistant
          </button>
        </div>
      </Card>
    </Page>
  )
}
