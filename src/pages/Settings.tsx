import { useState } from 'react'
import { Card, Page } from '../components/Page'
import { student } from '../data/student'

const toggles = [
  ['Drive announcements', 'Email me when a new company opens registration.'],
  ['Eligibility changes', 'Notify me when my stack placement changes.'],
  ['Alumni replies', 'Push notification when an alumnus responds.'],
  ['Weekly digest', 'A Monday summary of progress and deadlines.'],
] as const

export default function Settings() {
  const [on, setOn] = useState<Record<string, boolean>>({ 'Drive announcements': true, 'Eligibility changes': true, 'Alumni replies': false, 'Weekly digest': true })
  const [visibility, setVisibility] = useState('college')
  const [msg, setMsg] = useState('')

  return (
    <Page title="Settings" subtitle="Account, notification and privacy preferences.">
      <Card title="Account">
        <div className="grid grid-cols-2 gap-4 text-[12.5px]">
          {[['Name', student.name], ['Email', student.email], ['Branch', student.branch], ['Batch', student.batch]].map(([k, v]) => (
            <div key={k}>
              <p className="text-[11.5px] text-ink-mute">{k}</p>
              <p className="mt-0.5 font-medium text-ink">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Notifications">
        <div className="divide-y divide-line">
          {toggles.map(([label, desc]) => (
            <div key={label} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className="text-[12.5px] font-medium text-ink">{label}</p>
                <p className="text-[11.5px] text-ink-mute">{desc}</p>
              </div>
              <button
                onClick={() => setOn((o) => ({ ...o, [label]: !o[label] }))}
                className={`relative h-[22px] w-[40px] rounded-full transition ${on[label] ? 'bg-brand' : 'bg-[#dfe2e7]'}`}
              >
                <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all ${on[label] ? 'left-[21px]' : 'left-[3px]'}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Profile visibility">
        <div className="space-y-2">
          {[['college', 'Visible to my college placement cell and alumni'], ['recruiters', 'Visible to verified recruiters as well'], ['private', 'Private — only I can see my profile']].map(([v, label]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2 py-2 hover:bg-[#f7f8fa]">
              <input type="radio" name="vis" checked={visibility === v} onChange={() => setVisibility(v)} className="h-4 w-4 accent-[#6d4aff]" />
              <span className="text-[12.5px] text-ink-soft">{label}</span>
            </label>
          ))}
        </div>
        <button
          onClick={() => { setMsg('Preferences saved.'); setTimeout(() => setMsg(''), 2000) }}
          className="mt-3 rounded-[9px] bg-brand px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-brand-dark"
        >
          Save preferences
        </button>
        {msg && <span className="ml-3 text-[12px] font-medium text-[#0d9a5b]">{msg}</span>}
      </Card>
    </Page>
  )
}
