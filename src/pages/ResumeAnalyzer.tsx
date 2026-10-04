import { useState } from 'react'
import { Card, Meter, Page, Stat } from '../components/Page'
import { callApi } from '../lib/api'
import { useAuth, useProfile } from '../lib/auth'
import { extractResumeText } from '../lib/resumeText'
import { useApp } from '../lib/store'
import { errMsg, supabase, type JdMatch, type ResumeAnalysis } from '../lib/supabase'

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`
}
const tone = (v: number) => (v >= 80 ? '#12b76a' : v >= 60 ? '#f79009' : '#f04438')
const chip = 'rounded-md border px-2 py-[3px] text-[11px] font-medium'

export default function ResumeAnalyzer() {
  const p = useProfile()
  const { session, updateProfile, refreshProfile } = useAuth()
  const { openAssistant, showToast } = useApp()
  const [step, setStep] = useState<string | null>(null)
  const [jd, setJd] = useState('')
  const [matching, setMatching] = useState(false)
  const a = p.resume_analysis
  const busy = step !== null

  const analyzeFile = async (file: Blob, name: string) => {
    setStep('Reading your resume…')
    const text = await extractResumeText(file, name)
    setStep('Analyzing with AI…')
    await callApi<{ analysis: ResumeAnalysis }>('resume', { action: 'analyze', text, file_name: name })
    await refreshProfile()
  }

  const upload = async (file: File | undefined) => {
    if (!file || !session) return
    if (file.size > 5 * 1024 * 1024) return showToast('Resume must be under 5 MB.')
    if (!/\.(pdf|docx)$/i.test(file.name)) return showToast('Upload a PDF or DOCX file.')
    try {
      setStep('Uploading…')
      const safe = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${session.user.id}/${Date.now()}-${safe}`
      const { error } = await supabase.storage.from('resumes').upload(path, file, { contentType: file.type || 'application/pdf' })
      if (error) throw error
      const old = p.resume_path
      await updateProfile({ resume_path: path, resume_name: file.name, resume_uploaded_at: new Date().toISOString() })
      if (old) supabase.storage.from('resumes').remove([old])
      await analyzeFile(file, file.name)
      showToast('Resume analyzed.')
    } catch (e) {
      showToast(errMsg(e))
    } finally {
      setStep(null)
    }
  }

  const reanalyze = async () => {
    if (!p.resume_path) return
    try {
      setStep('Downloading…')
      const { data, error } = await supabase.storage.from('resumes').download(p.resume_path)
      if (error || !data) throw error ?? new Error('Download failed')
      await analyzeFile(data, p.resume_name ?? p.resume_path)
      showToast('Resume re-analyzed.')
    } catch (e) {
      showToast(errMsg(e))
    } finally {
      setStep(null)
    }
  }

  const view = async () => {
    if (!p.resume_path) return
    const win = window.open('', '_blank')
    const { data, error } = await supabase.storage.from('resumes').createSignedUrl(p.resume_path, 300)
    if (error || !data) {
      win?.close()
      return showToast(`Could not open resume: ${error?.message ?? 'unknown error'}`)
    }
    if (win) win.location.href = data.signedUrl
    else window.location.href = data.signedUrl
  }

  const remove = async () => {
    if (!p.resume_path || !window.confirm('Delete your uploaded resume and its analysis?')) return
    setStep('Deleting…')
    try {
      const { error } = await supabase.storage.from('resumes').remove([p.resume_path])
      if (error) throw error
      await updateProfile({ resume_path: null, resume_name: null, resume_uploaded_at: null, resume_text: null, resume_analysis: null, jd_match: null })
      showToast('Resume deleted.')
    } catch (e) {
      showToast(`Could not delete: ${errMsg(e)}`)
    } finally {
      setStep(null)
    }
  }

  const runMatch = async () => {
    setMatching(true)
    try {
      await callApi<{ match: JdMatch }>('resume', { action: 'match', jd })
      await refreshProfile()
    } catch (e) {
      showToast(errMsg(e))
    } finally {
      setMatching(false)
    }
  }

  const importToProfile = async () => {
    if (!a) return
    const haveProjects = new Set(p.projects.map((x) => x.toLowerCase()))
    const newProjects = a.extracted.projects
      .map((x) => (x.tech ? `${x.name} (${x.tech})` : x.name))
      .filter((x) => ![...haveProjects].some((h) => h.startsWith(x.split(' (')[0].toLowerCase())))
    const haveOrgs = new Set(p.internships.map((i) => i.org.toLowerCase()))
    const newInterns = a.extracted.internships.filter((i) => !haveOrgs.has(i.org.toLowerCase()))
    const haveCerts = new Set(p.certifications.map((c) => c.name.toLowerCase()))
    const newCerts = a.extracted.certifications.filter((c) => !haveCerts.has(c.toLowerCase())).map((name) => ({ name, issuer: '', date: '' }))
    if (!newProjects.length && !newInterns.length && !newCerts.length) return showToast('Your profile already has everything from this resume.')
    try {
      await updateProfile({
        projects: [...p.projects, ...newProjects],
        internships: [...p.internships, ...newInterns],
        certifications: [...p.certifications, ...newCerts],
      })
      showToast(`Imported ${newProjects.length} projects, ${newInterns.length} internships, ${newCerts.length} certifications.`)
    } catch (e) {
      showToast(errMsg(e))
    }
  }

  const jm = p.jd_match

  return (
    <Page title="Resume Analyzer" subtitle="Your resume is parsed, measured against ATS checks, reviewed by AI and matched to job descriptions.">
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <label className={`cursor-pointer rounded-[9px] border border-[#d5cbff] bg-white px-4 py-2 text-[12.5px] font-semibold text-brand-dark hover:bg-[#faf8ff] ${busy ? 'pointer-events-none opacity-60' : ''}`}>
            {p.resume_path ? 'Replace resume' : 'Upload resume (PDF / DOCX)'}
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              disabled={busy}
              onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }}
            />
          </label>
          {p.resume_path ? (
            <span className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-mute">
              {p.resume_name} {p.resume_uploaded_at && `(uploaded ${ago(p.resume_uploaded_at)})`}
              <button onClick={view} className="font-medium text-brand-dark hover:underline">View</button>
              <button onClick={reanalyze} disabled={busy} className="font-medium text-brand-dark hover:underline">Re-analyze</button>
              <button onClick={remove} disabled={busy} className="font-medium text-[#d92d20] hover:underline">Delete</button>
            </span>
          ) : (
            <span className="text-[12.5px] text-ink-faint">No resume uploaded yet. PDF or DOCX, up to 5 MB.</span>
          )}
          <div className="ml-auto text-right">
            <p className="text-[11px] text-ink-mute">Overall score</p>
            <p className="text-[26px] font-bold leading-none text-brand-dark">{a ? a.overall : '—'}<span className="text-[13px] text-ink-mute">/100</span></p>
          </div>
        </div>
        {step && <p className="mt-3 animate-pulse text-[12px] font-medium text-brand-dark">{step}</p>}
        {p.resume_path && !a && !step && (
          <p className="mt-3 rounded-[9px] border border-[#fbe3bd] bg-[#fff8ec] px-3 py-2 text-[12px] text-[#b45309]">
            This resume has not been analyzed yet. <button onClick={reanalyze} className="font-semibold underline">Analyze now</button>
          </p>
        )}
      </Card>

      {a && (
        <>
          <Card title="Summary" action={<span className="text-[11px] text-ink-faint">Analyzed {ago(a.analyzed_at)}</span>}>
            <p className="text-[12.5px] leading-[1.65] text-ink-soft">{a.summary}</p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              <Stat label="Words" value={`${a.stats.words}`} />
              <Stat label="Bullet points" value={`${a.stats.bullets}`} />
              <Stat label="With metrics" value={`${a.stats.quantified}`} />
              <Stat label="Action-verb starts" value={`${a.stats.action_verbs}`} />
              <Stat label="Sections found" value={`${a.stats.sections.length}`} sub={a.stats.sections.join(', ') || 'none'} />
            </div>
          </Card>

          <Card title="Breakdown">
            <div className="space-y-3.5">
              {a.checks.map((c) => (
                <div key={c.label}>
                  <Meter label={c.label} value={c.score} tone={tone(c.score)} />
                  {c.tip && <p className="mt-1 text-[11px] text-ink-faint">{c.tip}</p>}
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card title="Strengths">
              <ul className="space-y-1.5">
                {a.strengths.map((s) => <li key={s} className="text-[12px] text-ink-soft">✓ {s}</li>)}
              </ul>
            </Card>
            <Card title="Fix next">
              <ul className="space-y-1.5">
                {a.improvements.map((s) => <li key={s} className="text-[12px] text-ink-soft">→ {s}</li>)}
              </ul>
            </Card>
          </div>

          {a.rewrites.length > 0 && (
            <Card title="Suggested rewrites" action={<button onClick={() => openAssistant('Rewrite my weakest resume bullets with impact metrics.')} className="text-[11.5px] font-medium text-brand-dark hover:underline">Ask AI for more →</button>}>
              <div className="space-y-3">
                {a.rewrites.map((r) => (
                  <div key={r.before} className="rounded-[11px] border border-line bg-[#fafbfc] p-3">
                    <p className="text-[11.5px] text-[#d92d20] line-through">{r.before}</p>
                    <p className="mt-1.5 text-[12px] font-medium text-[#0d9a5b]">{r.after}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card
            title="Parsed from your resume"
            action={<button onClick={importToProfile} className="rounded-md bg-brand px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-brand-dark">Import into profile</button>}
          >
            <p className="text-[11.5px] font-semibold text-ink-mute">Skills ({a.extracted.skills.length})</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {a.extracted.skills.map((s) => <span key={s} className={`${chip} border-line bg-[#fafbfc] text-ink-soft`}>{s}</span>)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11.5px] font-semibold text-ink-mute">Projects</p>
                {a.extracted.projects.map((x) => (
                  <div key={x.name} className="mt-2">
                    <p className="text-[12.5px] font-semibold text-ink">{x.name}</p>
                    <p className="text-[11px] text-ink-faint">{x.tech}</p>
                    <p className="text-[11.5px] text-ink-mute">{x.description}</p>
                  </div>
                ))}
                {a.extracted.projects.length === 0 && <p className="mt-1 text-[12px] text-ink-faint">None found.</p>}
              </div>
              <div>
                <p className="text-[11.5px] font-semibold text-ink-mute">Experience</p>
                {a.extracted.internships.map((x) => (
                  <p key={x.org + x.role} className="mt-2 text-[12.5px] text-ink-soft"><b className="text-ink">{x.role}</b> · {x.org} <span className="text-ink-faint">{x.period}</span></p>
                ))}
                {a.extracted.internships.length === 0 && <p className="mt-1 text-[12px] text-ink-faint">None found.</p>}
                <p className="mt-4 text-[11.5px] font-semibold text-ink-mute">Certifications</p>
                {a.extracted.certifications.map((c) => <p key={c} className="mt-1 text-[12px] text-ink-soft">{c}</p>)}
                {a.extracted.certifications.length === 0 && <p className="mt-1 text-[12px] text-ink-faint">None found.</p>}
              </div>
            </div>
          </Card>
        </>
      )}

      <Card title="Match against a job description">
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={6}
          placeholder="Paste the full job description here (role, responsibilities, requirements)…"
          className="w-full rounded-[9px] border border-line bg-white px-3 py-2 text-[12.5px] outline-none focus:border-[#d5cbff] focus:ring-4 focus:ring-brand/10"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={runMatch}
            disabled={matching || !a || jd.trim().length < 80}
            className="rounded-[9px] bg-brand px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {matching ? 'Matching…' : 'Match my resume'}
          </button>
          {!a && <span className="text-[11.5px] text-ink-faint">Upload and analyze your resume first.</span>}
        </div>

        {jm && (
          <div className="mt-4 space-y-3 border-t border-line pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-ink">{jm.jd_title}</p>
                <p className="mt-0.5 text-[12px] text-ink-mute">{jm.verdict}</p>
              </div>
              <p className="text-[26px] font-bold leading-none" style={{ color: tone(jm.score) }}>{jm.score}<span className="text-[13px] text-ink-mute">% fit</span></p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11.5px] font-semibold text-[#0d9a5b]">Matched ({jm.matched_skills.length})</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{jm.matched_skills.map((s) => <span key={s} className={`${chip} border-[#c9f0d9] bg-[#ecfdf3] text-[#0d9a5b]`}>{s}</span>)}</div>
              </div>
              <div>
                <p className="text-[11.5px] font-semibold text-[#d92d20]">Missing ({jm.missing_skills.length})</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{jm.missing_skills.map((s) => <span key={s} className={`${chip} border-[#fbd5d1] bg-[#fef3f2] text-[#d92d20]`}>{s}</span>)}</div>
              </div>
            </div>
            {jm.missing_keywords.length > 0 && (
              <p className="text-[12px] text-ink-mute"><b className="text-ink">Keywords to add (if true):</b> {jm.missing_keywords.join(', ')}</p>
            )}
            {jm.suggestions.length > 0 && (
              <ul className="space-y-1">{jm.suggestions.map((s) => <li key={s} className="text-[12px] text-ink-soft">→ {s}</li>)}</ul>
            )}
            {jm.tailored_bullets.map((b) => (
              <p key={b} className="rounded-[9px] border border-line bg-[#fafbfc] px-3 py-2 text-[12px] font-medium text-[#0d9a5b]">{b}</p>
            ))}
          </div>
        )}
      </Card>
    </Page>
  )
}
