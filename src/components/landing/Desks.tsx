/** Three people, three views: what each one does here, and where their view stops. */
const desks = [
  { who: 'Students', ask: 'What should I do next?', does: ['An answer and a reason for every company', 'Resume check and job-description match', 'What-If: see a change’s effect before you work on it', 'A roadmap, practice sets and mock interviews for your branch', 'An assistant that answers from your own profile', 'Apply to campus drives and follow each status'] },
  { who: 'Placement cells', ask: 'Where does my batch stand?', does: ['Every class and section, by readiness', 'Filters by CGPA, backlogs, score and drive', 'Post drives and see who qualifies at once', 'Applications and joins arriving live', 'Recruiter logins limited to their own drives', 'A log of who changed what'] },
  { who: 'Recruiters', ask: 'Who should I meet?', does: ['Their drives, and only those', 'Applicants ranked, with the reasons', 'Rankings built on confirmed evidence', 'Shortlist, interview and offer in one place'] },
]

const rows: [string, string, string, string][] = [
  ['One student’s profile and marks', 'Their own', 'Their college', 'Applicants who allow it'],
  ['The whole batch', 'No', 'Their college', 'No'],
  ['Applicants to a drive', 'Own application', 'All drives', 'Their drives'],
  ['Another college', 'No', 'No', 'No'],
]

export function Desks() {
  return (
    <>
      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        {desks.map((d, i) => (
          <div key={d.who} className="flex flex-col overflow-hidden rounded-[28px] bg-white shadow-pop">
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

      <div className="scroll-thin mt-4 overflow-x-auto rounded-[24px] bg-white p-2 shadow-pop sm:p-4" tabIndex={0} role="region" aria-label="Who can see what">
        <table className="w-full min-w-[620px] border-collapse text-left text-[14.5px]">
          <caption className="px-4 pb-2 pt-3 text-left text-[19px] font-semibold tracking-[-0.02em] text-ink">Who can see what</caption>
          <thead>
            <tr className="text-[13px] text-ink-mute">
              <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Information</span></th>
              {['Student', 'Placement cell', 'Recruiter'].map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([what, ...cells]) => (
              <tr key={what} className="border-t border-line">
                <th scope="row" className="px-4 py-3.5 font-medium text-ink">{what}</th>
                {cells.map((c, i) => <td key={i} className={`px-4 py-3.5 ${c === 'No' ? 'text-ink-faint' : 'font-medium text-[#067647]'}`}>{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-[720px] text-[14.5px] leading-[1.6] text-ink-soft">
        These limits are rules in the database, not settings on a screen. Resumes open through links that expire within minutes, and college and platform admins sign in with a second step. <a href="/security" className="font-medium text-brand-dark underline underline-offset-4">How we protect data</a>
      </p>
    </>
  )
}
