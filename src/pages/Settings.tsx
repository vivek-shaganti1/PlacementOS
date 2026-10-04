import { useState } from 'react'
import { Card, Page } from '../components/Page'
import { useAuth, useProfile } from '../lib/auth'
import { useApp } from '../lib/store'
import { errMsg, supabase, type Profile } from '../lib/supabase'

const toggles = [
  ['Drive announcements', 'Email me when a new company opens registration.'],
  ['Eligibility changes', 'Notify me when my stack placement changes.'],
  ['Alumni replies', 'Push notification when an alumnus responds.'],
  ['Weekly digest', 'A Monday summary of progress and deadlines.'],
] as const

export default function Settings() {
  const p = useProfile()
  const { session, updateProfile, signOut } = useAuth()
  const { showToast } = useApp()
  const [on, setOn] = useState<Record<string, boolean>>(p.notification_prefs)
  const [visibility, setVisibility] = useState<Profile['visibility']>(p.visibility)
  const [busy, setBusy] = useState(false)
  const [pw, setPw] = useState({ next: '', confirm: '' })

  const savePrefs = async () => {
    setBusy(true)
    try {
      await updateProfile({ notification_prefs: on, visibility })
      showToast('Preferences saved.')
    } catch (e) {
      showToast(`Could not save: ${errMsg(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const changePassword = async () => {
    if (pw.next.length < 8) return showToast('Use at least 8 characters for your password.')
    if (pw.next !== pw.confirm) return showToast('Passwords do not match.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw.next })
    setBusy(false)
    if (error) return showToast(`Could not change password: ${error.message}`)
    setPw({ next: '', confirm: '' })
    showToast('Password updated.')
  }

  const dirty = JSON.stringify(on) !== JSON.stringify(p.notification_prefs) || visibility !== p.visibility

  return (
    <Page title="Settings" subtitle="Account, notification and privacy preferences.">
      <Card title="Account">
        <div className="grid grid-cols-1 gap-4 text-[12.5px] sm:grid-cols-2">
          {[['Name', p.full_name], ['Sign-in email', session?.user.email ?? ''], ['Branch', p.branch], ['Batch', p.batch]].map(([k, v]) => (
            <div key={k}>
              <p className="text-[11.5px] text-ink-mute">{k}</p>
              <p className="mt-0.5 break-words font-medium text-ink">{v}</p>
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
                role="switch"
                aria-checked={!!on[label]}
                aria-label={label}
                onClick={() => setOn((o) => ({ ...o, [label]: !o[label] }))}
                className={`relative h-[22px] w-[40px] rounded-[2px] ${on[label] ? 'bg-brand' : 'bg-[#CFC8BA]'}`}
              >
                <span className={`absolute top-[3px] h-4 w-4 rounded-[2px] bg-surface ${on[label] ? 'left-[21px]' : 'left-[3px]'}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Profile visibility">
        <div className="space-y-2">
          {([['college', 'Visible to my college placement cell and alumni'], ['recruiters', 'Visible to verified recruiters as well'], ['private', 'Private: only I can see my profile']] as const).map(([v, label]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2.5 rounded-[3px] px-2 py-2 hover:bg-[#F0EDE5]">
              <input type="radio" name="vis" checked={visibility === v} onChange={() => setVisibility(v)} className="h-4 w-4 accent-[#0F5A45]" />
              <span className="text-[12.5px] text-ink-soft">{label}</span>
            </label>
          ))}
        </div>
        <button
          onClick={savePrefs}
          disabled={busy || !dirty}
          className="mt-3 rounded-[3px] bg-brand px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          Save preferences
        </button>
      </Card>

      <Card title="Security">
        <div className="grid max-w-[520px] grid-cols-1 gap-3 sm:grid-cols-2">
          {(['next', 'confirm'] as const).map((k) => (
            <label key={k} className="block">
              <span className="text-[11.5px] font-medium text-ink-mute">{k === 'next' ? 'New password' : 'Confirm password'}</span>
              <input
                type="password"
                autoComplete="new-password"
                value={pw[k]}
                onChange={(e) => setPw({ ...pw, [k]: e.target.value })}
                className="mt-1 h-[36px] w-full rounded-[3px] border border-line bg-surface px-3 text-[12.5px] outline-none focus:border-[#C8C0B0]"
              />
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={changePassword} disabled={busy || !pw.next} className="rounded-[3px] border border-[#C8C0B0] px-4 py-2 text-[12.5px] font-semibold text-brand-dark hover:bg-[#F0EDE5] disabled:opacity-50">
            Change password
          </button>
          <button onClick={signOut} className="ml-auto rounded-[3px] border border-[#C8C0B0] px-4 py-2 text-[12.5px] font-semibold text-[#9C3526] hover:bg-[#F0EDE5]">
            Sign out
          </button>
        </div>
      </Card>
    </Page>
  )
}
