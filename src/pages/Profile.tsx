import { useState, type FormEvent } from 'react'
import Avatar from '../components/Avatar'
import { Achievements, Completeness, ConnectedAccounts, GithubProjects, VerifiedSkills } from '../components/ProfileExtras'
import { Card, Meter, Page } from '../components/Page'
import { useAuth, useProfile } from '../lib/auth'
import { useApp } from '../lib/store'
import { errMsg, supabase, type Internship, type Skill } from '../lib/supabase'

const input =
  'mt-1 h-[36px] w-full rounded-[9px] border border-line bg-white px-3 text-[12.5px] outline-none focus:border-[#d5cbff] focus:ring-4 focus:ring-brand/10'
const btnGhost = 'rounded-md border border-line px-3 py-1.5 text-[11.5px] font-medium text-ink-soft hover:bg-[#f7f8fa]'
const btnPrimary = 'rounded-[9px] bg-brand px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60'
const tone = (v: number) => (v >= 75 ? '#12b76a' : v >= 60 ? '#f79009' : '#f04438')

const fields = [
  ['full_name', 'Full name', 'text'],
  ['email', 'Contact email', 'email'],
  ['phone', 'Phone', 'tel'],
  ['meta', 'Year / headline', 'text'],
  ['target_roles', 'Target role', 'text'],
  ['branch', 'Branch', 'text'],
  ['batch', 'Batch', 'text'],
  ['college', 'College', 'text'],
  ['cgpa', 'CGPA (out of 10)', 'number'],
  ['backlogs', 'Active backlogs', 'number'],
  ['class_x', 'Class X %', 'number'],
  ['class_xii', 'Class XII %', 'number'],
] as const
type FieldKey = (typeof fields)[number][0]

export default function Profile() {
  const p = useProfile()
  const { updateProfile, session } = useAuth()
  const { showToast } = useApp()

  const [form, setForm] = useState<Record<FieldKey, string>>(() =>
    Object.fromEntries(fields.map(([k]) => [k, String(p[k] ?? '')])) as Record<FieldKey, string>,
  )
  const [busy, setBusy] = useState(false)
  const [editingSkills, setEditingSkills] = useState(false)
  const [skills, setSkills] = useState<Skill[]>(p.skills)
  const [newProject, setNewProject] = useState('')
  const [intern, setIntern] = useState<Internship>({ org: '', role: '', period: '' })
  const [uploading, setUploading] = useState(false)

  const save = async (patch: Parameters<typeof updateProfile>[0], msg: string) => {
    setBusy(true)
    try {
      await updateProfile(patch)
      showToast(msg)
      return true
    } catch (e) {
      showToast(`Could not save: ${errMsg(e)}`)
      return false
    } finally {
      setBusy(false)
    }
  }

  const submitDetails = (e: FormEvent) => {
    e.preventDefault()
    const num = (k: FieldKey) => Number(form[k])
    const bad =
      Number.isNaN(num('cgpa')) || num('cgpa') < 0 || num('cgpa') > 10 ? 'CGPA must be between 0 and 10.'
      : !Number.isInteger(num('backlogs')) || num('backlogs') < 0 ? 'Backlogs must be a whole number.'
      : [num('class_x'), num('class_xii')].some((v) => Number.isNaN(v) || v < 0 || v > 100) ? 'Percentages must be between 0 and 100.'
      : !form.full_name.trim() ? 'Name is required.'
      : ''
    if (bad) return showToast(bad)
    save(
      {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        meta: form.meta.trim(),
        target_roles: form.target_roles.trim() || 'Software Engineer (SDE)',
        branch: form.branch.trim(),
        batch: form.batch.trim(),
        college: form.college.trim(),
        cgpa: num('cgpa'),
        backlogs: num('backlogs'),
        class_x: num('class_x'),
        class_xii: num('class_xii'),
      },
      'Profile updated. Eligibility re-calculated.',
    )
  }

  const uploadAvatar = async (file: File | undefined) => {
    if (!file || !session) return
    if (file.size > 2 * 1024 * 1024) return showToast('Photo must be under 2 MB.')
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${session.user.id}/avatar-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const old = p.avatar_url?.split('/avatars/')[1]
      await updateProfile({ avatar_url: data.publicUrl })
      if (old) supabase.storage.from('avatars').remove([old])
      showToast('Profile photo updated.')
    } catch (e) {
      showToast(`Upload failed: ${errMsg(e)}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Page title="My Profile" subtitle="Your profile drives every eligibility calculation on PlacementIQ.">
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <Avatar src={p.avatar_url ?? undefined} name={p.full_name || p.email} size={64} />
            <label className="cursor-pointer text-[11px] font-medium text-brand-dark hover:underline">
              {uploading ? 'Uploading…' : 'Change photo'}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={uploading} onChange={(e) => uploadAvatar(e.target.files?.[0])} />
            </label>
          </div>
          <div className="min-w-[180px] flex-1">
            <p className="text-[17px] font-bold text-ink">{p.full_name}</p>
            <p className="text-[12.5px] text-ink-mute">{p.branch} · Batch {p.batch}</p>
            <p className="text-[11.5px] text-ink-faint">{p.college}</p>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto sm:gap-3">
            {[['CGPA', String(p.cgpa)], ['Backlogs', String(p.backlogs)], ['Class XII', `${p.class_xii}%`]].map(([k, v]) => (
              <div key={k} className="rounded-[11px] border border-line bg-[#fafbfc] px-2 py-2.5 sm:px-4">
                <p className="text-[10.5px] text-ink-mute">{k}</p>
                <p className="text-[16px] font-bold text-ink">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Completeness p={p} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Personal & academic details">
          <form className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2" onSubmit={submitDetails}>
            {fields.map(([k, label, type]) => (
              <label key={k} className={`block ${['full_name', 'email', 'college'].includes(k) ? 'sm:col-span-2' : ''}`}>
                <span className="text-[11.5px] font-medium text-ink-mute">{label}</span>
                <input
                  type={type}
                  step={type === 'number' ? 'any' : undefined}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className={input}
                />
              </label>
            ))}
            <div className="pt-1 sm:col-span-2">
              <button disabled={busy} className={btnPrimary}>Save changes</button>
            </div>
          </form>
        </Card>

        <Card
          title="Skills"
          action={
            editingSkills ? (
              <div className="flex gap-2">
                <button onClick={() => { setSkills(p.skills); setEditingSkills(false) }} className={btnGhost}>Cancel</button>
                <button
                  disabled={busy}
                  onClick={async () => { if (await save({ skills }, 'Skills updated.')) setEditingSkills(false) }}
                  className="rounded-md bg-brand px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-brand-dark"
                >
                  Save
                </button>
              </div>
            ) : (
              <button onClick={() => { setSkills(p.skills); setEditingSkills(true) }} className={btnGhost}>Edit</button>
            )
          }
        >
          <div className="space-y-3">
            {editingSkills
              ? skills.map((s, i) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-medium text-ink-soft">{s.name}</span>
                      <span className="font-semibold text-ink-mute">{s.level}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={s.level}
                      onChange={(e) => setSkills(skills.map((x, j) => (j === i ? { ...x, level: Number(e.target.value) } : x)))}
                      className="w-full accent-[#6d4aff]"
                    />
                  </div>
                ))
              : p.skills.map((s) => <Meter key={s.name} label={s.name} value={s.level} tone={tone(s.level)} />)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Projects">
          <ul className="space-y-2">
            {p.projects.map((proj, i) => (
              <li key={proj.title + i} className="group flex gap-2 text-[12.5px] text-ink-soft">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span className="flex-1">
                  <span className="font-semibold text-ink">{proj.url ? <a href={proj.url} target="_blank" rel="noreferrer" className="hover:underline">{proj.title}</a> : proj.title}</span>
                  {proj.tech && <span className="text-ink-faint"> · {proj.tech}</span>}
                  {proj.description && <span className="block text-[11.5px] text-ink-mute">{proj.description}</span>}
                </span>
                <button
                  onClick={() => save({ projects: p.projects.filter((_, j) => j !== i) }, 'Project removed.')}
                  className="text-[11px] text-ink-faint opacity-0 hover:text-[#d92d20] group-hover:opacity-100"
                >
                  Remove
                </button>
              </li>
            ))}
            {p.projects.length === 0 && <li className="text-[12px] text-ink-faint">No projects yet.</li>}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!newProject.trim()) return
              const m = newProject.trim().match(/^(.*?)\s*(?:\((.*)\))?$/)
              const project = { title: (m?.[1] || newProject).trim(), tech: (m?.[2] ?? '').trim(), description: '', url: null, source: 'manual' as const }
              if (await save({ projects: [...p.projects, project] }, 'Project added.')) setNewProject('')
            }}
          >
            <input value={newProject} onChange={(e) => setNewProject(e.target.value)} placeholder="Project name (tech stack)" className={`${input} mt-0 flex-1`} />
            <button disabled={busy} className={btnGhost}>Add</button>
          </form>
        </Card>

        <Card title="Internships">
          <div className="divide-y divide-line">
            {p.internships.map((it, i) => (
              <div key={it.org + i} className="group flex items-center py-2.5">
                <div className="flex-1">
                  <p className="text-[12.5px] font-semibold text-ink">{it.role} · {it.org}</p>
                  <p className="text-[11.5px] text-ink-mute">{it.period}</p>
                </div>
                <button
                  onClick={() => save({ internships: p.internships.filter((_, j) => j !== i) }, 'Internship removed.')}
                  className="text-[11px] text-ink-faint opacity-0 hover:text-[#d92d20] group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            ))}
            {p.internships.length === 0 && <p className="py-2 text-[12px] text-ink-faint">No internships yet.</p>}
          </div>
          <form
            className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!intern.org.trim() || !intern.role.trim()) return showToast('Organisation and role are required.')
              const next = { org: intern.org.trim(), role: intern.role.trim(), period: intern.period.trim() }
              if (await save({ internships: [...p.internships, next] }, 'Internship added.')) setIntern({ org: '', role: '', period: '' })
            }}
          >
            <input value={intern.org} onChange={(e) => setIntern({ ...intern, org: e.target.value })} placeholder="Organisation" className={`${input} mt-0`} />
            <input value={intern.role} onChange={(e) => setIntern({ ...intern, role: e.target.value })} placeholder="Role" className={`${input} mt-0`} />
            <input value={intern.period} onChange={(e) => setIntern({ ...intern, period: e.target.value })} placeholder="May - Jul 2025" className={`${input} mt-0`} />
            <button disabled={busy} className={btnGhost}>Add</button>
          </form>
        </Card>
      </div>

      <ConnectedAccounts p={p} />
      <VerifiedSkills p={p} />
      <GithubProjects p={p} />
      <Achievements p={p} />
    </Page>
  )
}
