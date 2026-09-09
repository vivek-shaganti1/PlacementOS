import { useNavigate } from 'react-router-dom'
import { byBucket, companies } from '../data/companies'
import { student } from '../data/student'
import CompanyLogo from '../components/CompanyLogo'
import { Card, Meter, Page, Stat } from '../components/Page'
import { useApp } from '../lib/store'

export default function Dashboard() {
  const navigate = useNavigate()
  const { applied, saved } = useApp()
  const eligible = byBucket('eligible')

  return (
    <Page title={`Welcome back, ${student.name.split(' ')[0]}`} subtitle="Here is where your placement readiness stands today." wide>
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Eligible Companies" value={`${eligible.length}`} sub={`out of ${companies.length} tracked`} tone="text-[#0d9a5b]" />
        <Stat label="Applications" value={`${applied.length}`} sub="submitted this season" />
        <Stat label="Saved Companies" value={`${saved.length}`} sub="in your shortlist" />
        <Stat label="Readiness Score" value="82" sub="+6 in the last 30 days" tone="text-brand-dark" />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Card title="Top matches for you" action={<button onClick={() => navigate('/eligibility')} className="text-[11.5px] font-medium text-brand-dark hover:underline">View all stacks →</button>}>
          <div className="divide-y divide-line">
            {eligible.slice(0, 6).map((c) => (
              <button key={c.id} onClick={() => navigate(`/eligibility?company=${c.id}`)} className="flex w-full items-center gap-3 py-2.5 text-left hover:opacity-80">
                <CompanyLogo company={c} size={24} />
                <span className="flex-1">
                  <span className="block text-[12.5px] font-semibold text-ink">{c.name}</span>
                  <span className="block text-[11px] text-ink-mute">{c.role}</span>
                </span>
                <span className="text-[12px] text-ink-mute">₹{c.ctcAvg.toFixed(1)} LPA</span>
                <span className="w-[52px] text-right text-[12px] font-semibold text-[#0d9a5b]">{c.match}%</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Skill snapshot" action={<button onClick={() => navigate('/skill-gap')} className="text-[11.5px] font-medium text-brand-dark hover:underline">Analyze →</button>}>
          <div className="space-y-3">
            {student.skills.slice(0, 5).map((s) => (
              <Meter key={s.name} label={s.name} value={s.level} tone={s.level >= 75 ? '#12b76a' : s.level >= 60 ? '#f79009' : '#f04438'} />
            ))}
          </div>
        </Card>
      </div>

      <Card title="Upcoming drives">
        <div className="divide-y divide-line">
          {companies.slice(0, 5).map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 py-2.5">
              <CompanyLogo company={c} size={22} />
              <span className="flex-1 text-[12.5px] font-medium text-ink">{c.name}</span>
              <span className="text-[11.5px] text-ink-mute">Registration closes in {i + 2} days</span>
              <button onClick={() => navigate(`/eligibility?company=${c.id}`)} className="rounded-md border border-line px-3 py-1.5 text-[11.5px] font-medium text-ink-soft hover:bg-[#f7f8fa]">
                Details
              </button>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  )
}
