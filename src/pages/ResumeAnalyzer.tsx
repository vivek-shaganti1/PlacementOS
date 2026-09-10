import { useState } from 'react'
import { Card, Meter, Page } from '../components/Page'
import { useApp } from '../lib/store'

const checks = [
  { label: 'Impact quantified with metrics', score: 62, tip: 'Add numbers to all three projects (users, latency, accuracy).' },
  { label: 'Keyword match for SDE roles', score: 88, tip: 'Good coverage of DSA, React, Node, SQL.' },
  { label: 'Formatting & ATS readability', score: 91, tip: 'Single column, standard headings — parses cleanly.' },
  { label: 'Section ordering', score: 70, tip: 'Move Skills above Education for a 3rd-year profile.' },
  { label: 'Length & density', score: 84, tip: 'One page, 11 bullet points — within range.' },
  { label: 'Action verbs', score: 79, tip: 'Replace "worked on" with "built", "shipped", "reduced".' },
]

export default function ResumeAnalyzer() {
  const [file, setFile] = useState<string | null>(null)
  const { openAssistant } = useApp()
  const overall = Math.round(checks.reduce((a, c) => a + c.score, 0) / checks.length)

  return (
    <Page title="Resume Analyzer" subtitle="Upload your resume to score it against the roles you are targeting.">
      <Card>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer rounded-[9px] border border-[#d5cbff] bg-white px-4 py-2 text-[12.5px] font-semibold text-brand-dark hover:bg-[#faf8ff]">
            Upload resume (PDF)
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
          </label>
          <span className="text-[12.5px] text-ink-mute">{file ?? 'Vivek_Shaganti_Resume.pdf (last analyzed 2 days ago)'}</span>
          <div className="ml-auto text-right">
            <p className="text-[11px] text-ink-mute">Overall score</p>
            <p className="text-[26px] font-bold leading-none text-brand-dark">{overall}<span className="text-[13px] text-ink-mute">/100</span></p>
          </div>
        </div>
      </Card>

      <Card title="Breakdown">
        <div className="space-y-3.5">
          {checks.map((c) => (
            <div key={c.label}>
              <Meter label={c.label} value={c.score} tone={c.score >= 80 ? '#12b76a' : c.score >= 65 ? '#f79009' : '#f04438'} />
              <p className="mt-1 text-[11px] text-ink-faint">{c.tip}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Suggested rewrites" action={<button onClick={() => openAssistant('Rewrite my resume bullets with impact metrics.')} className="text-[11.5px] font-medium text-brand-dark hover:underline">Ask AI →</button>}>
        <div className="space-y-3">
          {[
            ['Worked on a code editor project using React.', 'Built a real-time collaborative editor (React + WebSocket) serving 400 concurrent users at 90 ms sync latency.'],
            ['Made a dashboard for placement data.', 'Shipped a placement analytics dashboard (Next.js, Postgres) used by 1,200 students; cut report time from 2 days to 4 minutes.'],
          ].map(([before, after]) => (
            <div key={before} className="rounded-[11px] border border-line bg-[#fafbfc] p-3">
              <p className="text-[11.5px] text-[#d92d20] line-through">{before}</p>
              <p className="mt-1.5 text-[12px] font-medium text-[#0d9a5b]">{after}</p>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  )
}
