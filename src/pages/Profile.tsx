import { useState } from 'react'
import Avatar from '../components/Avatar'
import { Card, Meter, Page } from '../components/Page'
import { student } from '../data/student'

export default function Profile() {
  const [form, setForm] = useState({ email: student.email, phone: student.phone, cgpa: String(student.cgpa) })
  const [savedMsg, setSavedMsg] = useState('')

  return (
    <Page title="My Profile" subtitle="Your profile drives every eligibility calculation on PlacementIQ.">
      <Card>
        <div className="flex items-center gap-4">
          <Avatar src={student.avatar} name={student.name} size={64} />
          <div className="flex-1">
            <p className="text-[17px] font-bold text-ink">{student.name}</p>
            <p className="text-[12.5px] text-ink-mute">{student.branch} · Batch {student.batch}</p>
            <p className="text-[11.5px] text-ink-faint">{student.college}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[['CGPA', form.cgpa], ['Backlogs', String(student.backlogs)], ['Class XII', `${student.classXII}%`]].map(([k, v]) => (
              <div key={k} className="rounded-[11px] border border-line bg-[#fafbfc] px-4 py-2.5">
                <p className="text-[10.5px] text-ink-mute">{k}</p>
                <p className="text-[16px] font-bold text-ink">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Contact details">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              setSavedMsg('Profile updated. Eligibility re-calculated.')
              setTimeout(() => setSavedMsg(''), 2500)
            }}
          >
            {([['email', 'Email'], ['phone', 'Phone'], ['cgpa', 'CGPA']] as const).map(([k, label]) => (
              <label key={k} className="block">
                <span className="text-[11.5px] font-medium text-ink-mute">{label}</span>
                <input
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="mt-1 h-[36px] w-full rounded-[9px] border border-line bg-white px-3 text-[12.5px] outline-none focus:border-[#d5cbff] focus:ring-4 focus:ring-brand/10"
                />
              </label>
            ))}
            <button className="rounded-[9px] bg-brand px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-brand-dark">Save changes</button>
            {savedMsg && <p className="text-[11.5px] font-medium text-[#0d9a5b]">{savedMsg}</p>}
          </form>
        </Card>

        <Card title="Skills">
          <div className="space-y-3">
            {student.skills.map((s) => (
              <Meter key={s.name} label={s.name} value={s.level} tone={s.level >= 75 ? '#12b76a' : s.level >= 60 ? '#f79009' : '#f04438'} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Projects">
          <ul className="space-y-2">
            {student.projects.map((p) => (
              <li key={p} className="flex gap-2 text-[12.5px] text-ink-soft">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {p}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Internships">
          <div className="divide-y divide-line">
            {student.internships.map((i) => (
              <div key={i.org} className="py-2.5">
                <p className="text-[12.5px] font-semibold text-ink">{i.role} · {i.org}</p>
                <p className="text-[11.5px] text-ink-mute">{i.period}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  )
}
