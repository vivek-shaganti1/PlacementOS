import { useState } from 'react'
import { Card, Meter, Page } from '../components/Page'
import { useAuth, useProfile } from '../lib/auth'
import { useApp } from '../lib/store'
import { errMsg, supabase } from '../lib/supabase'

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`
}

const checks = [
  { label: 'Impact quantified with metrics', score: 62, tip: 'Add numbers to all three projects (users, latency, accuracy).' },
  { label: 'Keyword match for SDE roles', score: 88, tip: 'Good coverage of DSA, React, Node, SQL.' },
  { label: 'Formatting & ATS readability', score: 91, tip: 'Single column, standard headings — parses cleanly.' },
  { label: 'Section ordering', score: 70, tip: 'Move Skills above Education for a 3rd-year profile.' },
  { label: 'Length & density', score: 84, tip: 'One page, 11 bullet points — within range.' },
  { label: 'Action verbs', score: 79, tip: 'Replace "worked on" with "built", "shipped", "reduced".' },
]

export default function ResumeAnalyzer() {
  const p = useProfile()
  const { session, updateProfile } = useAuth()
  const { openAssistant, showToast } = useApp()
  const [busy, setBusy] = useState(false)

  const upload = async (file: File | undefined) => {
    if (!file || !session) return
    if (file.size > 5 * 1024 * 1024) return showToast('Resume must be under 5 MB.')
    setBusy(true)
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${session.user.id}/${Date.now()}-${safe}`
      const { error } = await supabase.storage.from('resumes').upload(path, file, { contentType: file.type || 'application/pdf' })
      if (error) throw error
      const old = p.resume_path
      await updateProfile({ resume_path: path, resume_name: file.name, resume_uploaded_at: new Date().toISOString() })
      if (old) supabase.storage.from('resumes').remove([old])
      showToast('Resume uploaded and analyzed.')
    } catch (e) {
      showToast(`Upload failed: ${errMsg(e)}`)
    } finally {
      setBusy(false)
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
    if (!p.resume_path || !window.confirm('Delete your uploaded resume?')) return
    setBusy(true)
    try {
      const { error } = await supabase.storage.from('resumes').remove([p.resume_path])
      if (error) throw error
      await updateProfile({ resume_path: null, resume_name: null, resume_uploaded_at: null })
      showToast('Resume deleted.')
    } catch (e) {
      showToast(`Could not delete: ${errMsg(e)}`)
    } finally {
      setBusy(false)
    }
  }
  const overall = Math.round(checks.reduce((a, c) => a + c.score, 0) / checks.length)

  return (
    <Page title="Resume Analyzer" subtitle="Upload your resume to score it against the roles you are targeting.">
      <Card>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer rounded-[9px] border border-[#d5cbff] bg-white px-4 py-2 text-[12.5px] font-semibold text-brand-dark hover:bg-[#faf8ff]">
            {busy ? 'Uploading…' : p.resume_path ? 'Replace resume' : 'Upload resume (PDF)'}
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              disabled={busy}
              onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }}
            />
          </label>
          {p.resume_path ? (
            <span className="flex items-center gap-2 text-[12.5px] text-ink-mute">
              {p.resume_name} {p.resume_uploaded_at && `(uploaded ${ago(p.resume_uploaded_at)})`}
              <button onClick={view} className="font-medium text-brand-dark hover:underline">View</button>
              <button onClick={remove} disabled={busy} className="font-medium text-[#d92d20] hover:underline">Delete</button>
            </span>
          ) : (
            <span className="text-[12.5px] text-ink-faint">No resume uploaded yet. PDF or Word, up to 5 MB.</span>
          )}
          <div className="ml-auto text-right">
            <p className="text-[11px] text-ink-mute">Overall score</p>
            <p className="text-[26px] font-bold leading-none text-brand-dark">{p.resume_path ? overall : '—'}<span className="text-[13px] text-ink-mute">/100</span></p>
          </div>
        </div>
      </Card>

      {p.resume_path && <Card title="Breakdown">
        <div className="space-y-3.5">
          {checks.map((c) => (
            <div key={c.label}>
              <Meter label={c.label} value={c.score} tone={c.score >= 80 ? '#12b76a' : c.score >= 65 ? '#f79009' : '#f04438'} />
              <p className="mt-1 text-[11px] text-ink-faint">{c.tip}</p>
            </div>
          ))}
        </div>
      </Card>}

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
