import { useNavigate } from 'react-router-dom'
import { useCompanies } from '../lib/companies'
import CompanyLogo from '../components/CompanyLogo'
import { IconDrives, IconStacks } from '../components/Icons'
import { Card, EmptyState, Page, Stat } from '../components/Page'
import { useProfile } from '../lib/auth'
import { STATUS_META, useJobs, type JobStatus } from '../lib/jobs'
import { useApp } from '../lib/store'
import { HoldButton } from '../components/HoldButton'

const stages = ['Applied', 'Online Assessment', 'Technical Round', 'HR Round', 'Offer']
const driveStages: JobStatus[] = ['applied', 'shortlisted', 'interview', 'offer']

export default function Applications() {
  const { applications, saved, toggleSave, setStage, withdraw } = useApp()
  const navigate = useNavigate()
  const { companies } = useCompanies()
  const stageOf = Object.fromEntries(applications.map((a) => [a.company_id, a.stage]))
  const rows = applications.map((a) => companies.find((c) => c.id === a.company_id)).filter((c): c is (typeof companies)[number] => !!c)
  const offers = applications.filter((a) => a.stage === stages.length - 1).length
  const savedRows = companies.filter((c) => saved.includes(c.id))
  // Campus drives posted by your placement cell: the status is set by the placement cell or recruiter, not by you.
  const profile = useProfile()
  const { jobs, applications: driveApps } = useJobs()
  const myDrives = driveApps
    .filter((a) => a.user_id === profile.id)
    .map((a) => ({ a, job: jobs.find((j) => j.id === a.job_id) }))
    .filter((x): x is { a: (typeof driveApps)[number]; job: (typeof jobs)[number] } => !!x.job)
  const driveOffers = myDrives.filter((x) => x.a.status === 'offer').length
  const driveActive = myDrives.filter((x) => x.a.status !== 'offer' && x.a.status !== 'rejected').length

  return (
    <Page title="Applications" subtitle="Everything you have applied to and shortlisted." wide>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Applied" value={`${rows.length + myDrives.length}`} sub={`${myDrives.length} campus drives · ${rows.length} tracked`} />
        <Stat label="In progress" value={`${rows.length - offers + driveActive}`} tone="text-[#d97706]" />
        <Stat label="Offers" value={`${offers + driveOffers}`} tone="text-[#0d9a5b]" />
        <Stat label="Shortlisted" value={`${savedRows.length}`} tone="text-brand-dark" />
      </div>

      <Card title="Campus drives" action={<button onClick={() => navigate('/jobs')} className="text-[11.5px] font-semibold text-brand-dark hover:underline">All campus jobs →</button>}>
        {myDrives.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink-faint">
            You have not applied to a campus drive yet.{' '}
            <button onClick={() => navigate('/jobs')} className="font-medium text-brand-dark hover:underline">See open drives</button>
          </p>
        ) : (
          <div className="divide-y divide-line">
            {myDrives.map(({ a, job }) => {
              const at = driveStages.indexOf(a.status)
              return (
                <div key={a.job_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                  <div className="min-w-0 flex-1 sm:w-[200px] sm:flex-none">
                    <p className="text-[12.5px] font-semibold text-ink">{job.company}</p>
                    <p className="text-[11px] text-ink-mute">{job.role}</p>
                  </div>
                  <div className="order-last flex w-full items-center gap-1.5 sm:order-none sm:w-auto sm:flex-1" aria-label={`Status: ${STATUS_META[a.status].label}`}>
                    {driveStages.map((s, si) => (
                      <span key={s} className="flex flex-1 flex-col items-center gap-1">
                        <span className={`h-[5px] w-full rounded-full ${a.status === 'rejected' ? 'bg-[#fbd5d1]' : si <= at ? 'bg-brand' : 'bg-[#eef0f3]'}`} />
                        <span className={`text-[9.5px] ${si <= at && a.status !== 'rejected' ? 'font-semibold text-brand-dark' : 'text-ink-faint'}`}>{STATUS_META[s].label}</span>
                      </span>
                    ))}
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_META[a.status].cls}`}>{STATUS_META[a.status].label}</span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="Companies you are tracking">
        {rows.length === 0 ? (
          <EmptyState
            icon={<IconStacks className="h-5 w-5" />}
            title="Track companies outside campus drives"
            body="Open any company in Eligibility Stacks and choose Apply Now to follow it through each round here."
            action={<button onClick={() => navigate('/eligibility')} className="btn-glass">Open Eligibility Stacks</button>}
          />
        ) : (
          <div className="divide-y divide-line">
            {rows.map((c) => {
              const stage = stageOf[c.id] ?? 0
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                  <CompanyLogo company={c} size={24} />
                  <div className="min-w-0 flex-1 sm:w-[170px] sm:flex-none">
                    <p className="text-[12.5px] font-semibold text-ink">{c.name}</p>
                    <p className="text-[11px] text-ink-mute">{c.role}</p>
                  </div>
                  <div className="order-last flex w-full items-center gap-1.5 sm:order-none sm:w-auto sm:flex-1">
                    {stages.map((s, si) => (
                      <span key={s} className="flex flex-1 flex-col items-center gap-1">
                        <span className={`h-[5px] w-full rounded-full ${si <= stage ? 'bg-brand' : 'bg-[#eef0f3]'}`} />
                        <span className={`text-[9.5px] ${si <= stage ? 'font-semibold text-brand-dark' : 'text-ink-faint'}`}>{s}</span>
                      </span>
                    ))}
                  </div>
                  <select
                    value={stage}
                    onChange={(e) => setStage(c.id, Number(e.target.value))}
                    aria-label={`Stage for ${c.name}`}
                    className="h-[30px] rounded-md border border-line bg-white px-2 text-[11.5px] text-ink-soft outline-none"
                  >
                    {stages.map((s, si) => <option key={s} value={si}>{s}</option>)}
                  </select>
                  <button onClick={() => navigate(`/eligibility?company=${c.id}`)} className="rounded-md border border-line px-3 py-1.5 text-[11.5px] font-medium text-ink-soft hover:bg-[#f7f8fa]">
                    View
                  </button>
                  <HoldButton
                    onConfirm={() => withdraw(c.id)}
                    warning={`Withdraws your application to ${c.name}.`}
                    className="rounded-md border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-[#d92d20] hover:bg-[#fef3f2]"
                  >
                    Withdraw
                  </HoldButton>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="Saved companies">
        {savedRows.length === 0 ? (
          <EmptyState icon={<IconDrives className="h-5 w-5" />} title="Nothing saved yet" body="Save a company from its panel to shortlist it for later." />
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
