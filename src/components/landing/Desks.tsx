import { Rise } from './Section'

/** Three people, three questions, and what each one gets. The limits are in the table below them (WhoSees). */
const desks = [
  { who: 'Students', ask: 'What should I do next?', does: ['An answer and a reason for every company', 'Resume check and job-description match', 'What-If: test a change before you work on it', 'A roadmap, practice sets and mock interviews for your branch', 'An assistant that answers from your own profile', 'Apply to campus drives and follow each status'] },
  { who: 'Placement cells', ask: 'Where does my batch stand?', does: ['Every class and section, by readiness', 'Filters by CGPA, backlogs, score and drive', 'Post drives and see who qualifies at once', 'Applications and joins arriving live', 'Recruiter logins limited to their own drives', 'A log of who changed what'] },
  { who: 'Recruiters', ask: 'Who should I meet?', does: ['Their drives, and only those', 'Applicants ranked, with the reasons', 'Rankings built on confirmed evidence', 'Shortlist, interview and offer in one place'] },
]

export function Desks() {
  return (
    <Rise>
      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        {desks.map((d, i) => (
          <div key={d.who} className="flex flex-col overflow-hidden rounded-[28px] bg-white/90 shadow-pop">
            <div className={`lq-silk lq-silk--${i + 1} flex min-h-[190px] flex-col justify-end p-6`}>
              <h3 className="text-[15px] font-semibold text-ink">{d.who}</h3>
              <p className="mt-1 font-display text-[clamp(1.9rem,1.4rem+1.3vw,2.5rem)] leading-[1.05] text-ink">{d.ask}</p>
            </div>
            <ul className="space-y-2.5 p-6 text-[15px] leading-[1.5] text-ink-soft">
              {d.does.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        ))}
      </div>

    </Rise>
  )
}
