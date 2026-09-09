import { useNavigate } from 'react-router-dom'
import { companies } from '../data/companies'
import CompanyLogo from '../components/CompanyLogo'
import { Card, Page, Stat } from '../components/Page'
import { useApp } from '../lib/store'

const stages = ['Applied', 'Online Assessment', 'Technical Round', 'HR Round', 'Offer']

export default function Applications() {
  const { applied, saved, toggleSave } = useApp()
  const navigate = useNavigate()
  const rows = companies.filter((c) => applied.includes(c.id))
  const savedRows = companies.filter((c) => saved.includes(c.id))

  return (
    <Page title="Applications" subtitle="Everything you have applied to and shortlisted." wide>
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Applied" value={`${rows.length}`} />
        <Stat label="In progress" value={`${Math.min(rows.length, 2)}`} tone="text-[#d97706]" />
        <Stat label="Offers" value="0" tone="text-[#0d9a5b]" />
        <Stat label="Shortlisted" value={`${savedRows.length}`} tone="text-brand-dark" />
      </div>

      <Card title="Your applications">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink-faint">
            No applications yet — open a company from{' '}
            <button onClick={() => navigate('/eligibility')} className="font-medium text-brand-dark hover:underline">Eligibility Stacks</button>{' '}
            and hit Apply Now.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {rows.map((c, i) => {
              const stage = i % stages.length
              return (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <CompanyLogo company={c} size={24} />
                  <div className="w-[170px]">
                    <p className="text-[12.5px] font-semibold text-ink">{c.name}</p>
                    <p className="text-[11px] text-ink-mute">{c.role}</p>
                  </div>
                  <div className="flex flex-1 items-center gap-1.5">
                    {stages.map((s, si) => (
                      <span key={s} className="flex flex-1 flex-col items-center gap-1">
                        <span className={`h-[5px] w-full rounded-full ${si <= stage ? 'bg-brand' : 'bg-[#eef0f3]'}`} />
                        <span className={`text-[9.5px] ${si <= stage ? 'font-semibold text-brand-dark' : 'text-ink-faint'}`}>{s}</span>
                      </span>
                    ))}
                  </div>
                  <button onClick={() => navigate(`/eligibility?company=${c.id}`)} className="rounded-md border border-line px-3 py-1.5 text-[11.5px] font-medium text-ink-soft hover:bg-[#f7f8fa]">
                    View
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="Saved companies">
        {savedRows.length === 0 ? (
          <p className="py-5 text-center text-[12.5px] text-ink-faint">Nothing saved yet.</p>
        ) : (
          <div className="divide-y divide-line">
            {savedRows.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5">
                <CompanyLogo company={c} size={22} />
                <span className="flex-1 text-[12.5px] font-medium text-ink">{c.name}</span>
                <span className="text-[12px] text-ink-mute">{c.match}% match</span>
                <button onClick={() => toggleSave(c.id)} className="rounded-md border border-line px-3 py-1.5 text-[11.5px] font-medium text-ink-soft hover:bg-[#f7f8fa]">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Page>
  )
}
