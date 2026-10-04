import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { LogoMark } from '../components/Logo'
import { Aurora, Meter, Ring } from '../components/Page'
import { callApi } from '../lib/api'
import { useAuth, useProfile } from '../lib/auth'
import { SKILLS } from '../lib/eligibility'
import { resumeImports, uploadAndAnalyzeResume } from '../lib/resumeFlow'
import { errMsg } from '../lib/supabase'
import { allEvidence } from '../lib/verify'

const BRANCHES = ['Computer Science & Engineering', 'Information Technology', 'CSE (AI & ML)', 'CSE (Data Science)', 'Electronics & Communication', 'Electrical & Electronics', 'Mechanical', 'Civil']
const STEPS = ['About you', 'Academics', 'Resume', 'Accounts', 'Skills'] as const
const ease = [0.16, 1, 0.3, 1] as const

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-ink-soft">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-ink-faint">{hint}</span>}
    </label>
  )
}

export default function Onboarding() {
  const p = useProfile()
  const { session, updateProfile, refreshProfile, signOut, isAdmin } = useAuth()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [about, setAbout] = useState({
    full_name: p.full_name,
    phone: p.phone,
    college: p.college,
    branch: p.branch,
    batch: p.batch,
    meta: p.meta,
    target_roles: p.target_roles || 'Software Engineer (SDE)',
  })
  const [acad, setAcad] = useState({ cgpa: p.cgpa ? String(p.cgpa) : '', backlogs: String(p.backlogs ?? 0), class_x: p.class_x ? String(p.class_x) : '', class_xii: p.class_xii ? String(p.class_xii) : '' })
  const [links, setLinks] = useState({
    github: p.github_username ?? '',
    linkedin_url: p.linkedin_url ?? '',
    leetcode: p.leetcode_username ?? '',
    codeforces: p.codeforces_username ?? '',
    codechef: p.codechef_username ?? '',
    portfolio_url: p.portfolio_url ?? '',
  })
  const evidence = allEvidence(p.integrations ?? {}, p.resume_analysis)
  const [levels, setLevels] = useState<Record<string, number>>(() =>
    Object.fromEntries(SKILLS.map((s) => [s, evidence[s]?.level ?? p.skills.find((x) => x.name === s)?.level ?? 0])),
  )

  // When the skills step opens, pre-fill from the freshly synced evidence (the profile has just been refreshed).
  useEffect(() => {
    if (step !== 4) return
    setLevels((l) => Object.fromEntries(SKILLS.map((s) => [s, evidence[s]?.level ?? l[s]])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, p.integrations, p.resume_analysis])

  const run = async (label: string, fn: () => Promise<void>) => {
    setError('')
    setBusy(label)
    try {
      await fn()
      return true
    } catch (e) {
      setError(errMsg(e))
      return false
    } finally {
      setBusy(null)
    }
  }

  const next = async () => {
    if (step === 0) {
      if (!about.full_name.trim() || !about.college.trim() || !about.branch.trim() || !/^\d{4}$/.test(about.batch.trim()) || !about.phone.trim())
        return setError('Fill in your name, phone, college, branch and a 4-digit graduation batch.')
      if (await run('Saving…', () => updateProfile(Object.fromEntries(Object.entries(about).map(([k, v]) => [k, v.trim()]))))) setStep(1)
    } else if (step === 1) {
      const n = { cgpa: Number(acad.cgpa), backlogs: Number(acad.backlogs), class_x: Number(acad.class_x), class_xii: Number(acad.class_xii) }
      if (!(n.cgpa > 0 && n.cgpa <= 10)) return setError('CGPA must be between 0 and 10.')
      if (!Number.isInteger(n.backlogs) || n.backlogs < 0) return setError('Backlogs must be a whole number.')
      if (![n.class_x, n.class_xii].every((v) => v > 0 && v <= 100)) return setError('Class X and XII percentages must be between 0 and 100.')
      if (await run('Saving…', () => updateProfile(n))) setStep(2)
    } else if (step === 2) {
      if (!p.resume_path) return setError('Upload your resume to continue — it powers your skill and eligibility analysis.')
      setStep(3)
    } else if (step === 3) {
      const gh = links.github.trim()
      const li = links.linkedin_url.trim()
      if (!gh) return setError('Add your GitHub username — your projects and tech stack are read from it.')
      if (!/linkedin\.com\/in\//i.test(li)) return setError('Add your LinkedIn profile URL (linkedin.com/in/…).')
      const ok = await run('Connecting your accounts…', async () => {
        const platforms = (['github', 'leetcode', 'codeforces', 'codechef'] as const).filter((k) => links[k].trim() && links[k].trim() !== p[`${k}_username`])
        const failures: string[] = []
        for (const platform of platforms) {
          setBusy(`Syncing ${platform}…`)
          try {
            await callApi('connect', { platform, username: links[platform].trim() })
          } catch (e) {
            failures.push(`${platform}: ${errMsg(e)}`)
          }
        }
        const url = (v: string) => (v.trim() ? (/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`) : null)
        await updateProfile({ linkedin_url: url(li), portfolio_url: url(links.portfolio_url) })
        if (failures.length) throw new Error(failures.join(' · '))
      })
      await refreshProfile()
      if (ok) setStep(4)
    } else {
      await run('Finishing…', () => updateProfile({ skills: SKILLS.map((name) => ({ name, level: levels[name] })), onboarded_at: new Date().toISOString() }))
    }
  }

  const uploadResume = (file: File | undefined) =>
    file &&
    session &&
    run('Uploading…', async () => {
      await uploadAndAnalyzeResume(file, session.user.id, p, updateProfile, setBusy)
      await refreshProfile()
    })

  const importResume = () => {
    const patch = resumeImports(p)
    if (patch) run('Importing…', () => updateProfile(patch))
  }

  const a = p.resume_analysis
  const imports = resumeImports(p)

  return (
    <div className="relative min-h-screen overflow-y-auto">
      <Aurora />
      <div className="relative z-10 mx-auto max-w-[820px] px-6 py-10">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <div className="flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brand">Set up your profile</p>
            <p className="text-[13px] text-ink-mute">About 3 minutes. Everything you add here is scored against every company and campus drive.</p>
          </div>
          {isAdmin && (
            <button onClick={() => updateProfile({ onboarded_at: new Date().toISOString() })} className="text-[12px] font-medium text-ink-mute hover:underline">
              Skip (placement staff)
            </button>
          )}
          <button onClick={signOut} className="text-[12px] font-medium text-ink-faint hover:underline">Sign out</button>
        </div>

        <div className="mt-8 grid grid-cols-5 gap-2">
          {STEPS.map((s, i) => (
            <div key={s}>
              <span className="block h-1.5 overflow-hidden rounded-full bg-white/60">
                <motion.span className="block h-full origin-left rounded-full bg-gradient-to-r from-[#6d4aff] to-[#38bdf8]" animate={{ scaleX: i < step ? 1 : i === step ? 0.5 : 0 }} transition={{ duration: 0.5, ease }} />
              </span>
              <p className={`mt-2 text-[11.5px] font-semibold ${i <= step ? 'text-ink' : 'text-ink-faint'}`}>{i + 1}. {s}</p>
            </div>
          ))}
        </div>

        <div className="glass-strong mt-6 rounded-[26px] p-7">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3, ease }}>
              {step === 0 && (
                <div className="space-y-4">
                  <h2 className="text-[22px] font-semibold tracking-[-0.03em]">Tell us about you</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Full name"><input className="field" value={about.full_name} onChange={(e) => setAbout({ ...about, full_name: e.target.value })} /></Field>
                    <Field label="Phone"><input className="field" value={about.phone} onChange={(e) => setAbout({ ...about, phone: e.target.value })} placeholder="+91 …" /></Field>
                    <Field label="College"><input className="field" value={about.college} onChange={(e) => setAbout({ ...about, college: e.target.value })} /></Field>
                    <Field label="Branch">
                      <input className="field" list="branches" value={about.branch} onChange={(e) => setAbout({ ...about, branch: e.target.value })} placeholder="Computer Science & Engineering" />
                      <datalist id="branches">{BRANCHES.map((b) => <option key={b} value={b} />)}</datalist>
                    </Field>
                    <Field label="Graduation batch" hint="Year you graduate, e.g. 2027"><input className="field" value={about.batch} onChange={(e) => setAbout({ ...about, batch: e.target.value })} /></Field>
                    <Field label="Year / headline"><input className="field" value={about.meta} onChange={(e) => setAbout({ ...about, meta: e.target.value })} placeholder="CSE - 3rd Year" /></Field>
                    <div className="col-span-2">
                      <Field label="Target role"><input className="field" value={about.target_roles} onChange={(e) => setAbout({ ...about, target_roles: e.target.value })} /></Field>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-[22px] font-semibold tracking-[-0.03em]">Your academics</h2>
                  <p className="text-[12.5px] text-ink-mute">Recruiters filter on these first. Use the values on your latest marksheet.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CGPA (out of 10)"><input className="field" inputMode="decimal" value={acad.cgpa} onChange={(e) => setAcad({ ...acad, cgpa: e.target.value })} /></Field>
                    <Field label="Active backlogs"><input className="field" inputMode="numeric" value={acad.backlogs} onChange={(e) => setAcad({ ...acad, backlogs: e.target.value })} /></Field>
                    <Field label="Class X %"><input className="field" inputMode="decimal" value={acad.class_x} onChange={(e) => setAcad({ ...acad, class_x: e.target.value })} /></Field>
                    <Field label="Class XII / Diploma %"><input className="field" inputMode="decimal" value={acad.class_xii} onChange={(e) => setAcad({ ...acad, class_xii: e.target.value })} /></Field>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-[22px] font-semibold tracking-[-0.03em]">Upload your resume</h2>
                  <p className="text-[12.5px] text-ink-mute">We read it in your browser, score it against ATS checks and pull out your projects, experience and skills.</p>
                  <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-[oklch(0.8_0.08_285)] bg-white/50 px-6 py-8 text-center transition hover:bg-white/80 ${busy ? 'pointer-events-none opacity-70' : ''}`}>
                    <span className="text-[14px] font-semibold text-brand-dark">{p.resume_path ? 'Replace resume' : 'Choose your resume'}</span>
                    <span className="text-[12px] text-ink-faint">PDF or DOCX, up to 5 MB{p.resume_name ? ` · current: ${p.resume_name}` : ''}</span>
                    <input type="file" className="hidden" accept=".pdf,.docx" onChange={(e) => { uploadResume(e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                  {a && (
                    <div className="flex items-center gap-5 rounded-[18px] border border-white/80 bg-white/70 p-4">
                      <Ring value={a.overall} size={96} stroke={9} label="Resume score" />
                      <div className="flex-1 text-[12.5px] text-ink-soft">
                        <p>{a.summary}</p>
                        <p className="mt-2 text-[11.5px] text-ink-mute">
                          Found {a.extracted.projects.length} projects, {a.extracted.internships.length} internships, {a.extracted.skills.length} skills.
                        </p>
                        {imports && (
                          <button onClick={importResume} className="btn-glass mt-2 py-1.5 text-[12px]">Add them to my profile</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="text-[22px] font-semibold tracking-[-0.03em]">Connect your accounts</h2>
                  <p className="text-[12.5px] text-ink-mute">GitHub gives us your real projects and tech stack; coding platforms give us your DSA level. Public data only.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="GitHub username (required)"><input className="field" value={links.github} onChange={(e) => setLinks({ ...links, github: e.target.value })} placeholder="your-github" /></Field>
                    <Field label="LinkedIn URL (required)"><input className="field" value={links.linkedin_url} onChange={(e) => setLinks({ ...links, linkedin_url: e.target.value })} placeholder="linkedin.com/in/you" /></Field>
                    <Field label="LeetCode username"><input className="field" value={links.leetcode} onChange={(e) => setLinks({ ...links, leetcode: e.target.value })} /></Field>
                    <Field label="Codeforces handle"><input className="field" value={links.codeforces} onChange={(e) => setLinks({ ...links, codeforces: e.target.value })} /></Field>
                    <Field label="CodeChef username"><input className="field" value={links.codechef} onChange={(e) => setLinks({ ...links, codechef: e.target.value })} /></Field>
                    <Field label="Portfolio / website"><input className="field" value={links.portfolio_url} onChange={(e) => setLinks({ ...links, portfolio_url: e.target.value })} /></Field>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <h2 className="text-[22px] font-semibold tracking-[-0.03em]">Confirm your skill levels</h2>
                  <p className="text-[12.5px] text-ink-mute">
                    Pre-filled from your resume, GitHub and coding stats where we found evidence. Adjust anything that looks off — be honest, recruiters test these.
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {SKILLS.map((s) => (
                      <div key={s}>
                        <Meter label={s} value={levels[s]} tone={levels[s] >= 75 ? '#12b76a' : levels[s] >= 55 ? '#f79009' : '#f04438'} />
                        <input type="range" min={0} max={100} value={levels[s]} onChange={(e) => setLevels({ ...levels, [s]: Number(e.target.value) })} className="mt-1 w-full accent-[#6d4aff]" aria-label={s} />
                        <p className="text-[10.5px] text-ink-faint">{evidence[s] ? `Evidence: ${evidence[s].sources.join(' · ')}` : 'Self-rated'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {error && <p className="mt-5 rounded-[12px] border border-[#fbd5d1] bg-[#fef3f2]/90 px-3 py-2 text-[12px] text-[#d92d20]">{error}</p>}

          <div className="mt-6 flex items-center gap-3">
            {step > 0 && (
              <button onClick={() => { setError(''); setStep(step - 1) }} disabled={!!busy} className="btn-glass">
                Back
              </button>
            )}
            {busy && <span className="animate-pulse text-[12px] font-medium text-brand-dark">{busy}</span>}
            <button onClick={next} disabled={!!busy} className="btn-primary ml-auto h-[42px] px-6">
              {step === STEPS.length - 1 ? 'Finish & see my matches' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
