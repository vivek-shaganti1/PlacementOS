import { useState } from 'react'
import { Card, Page } from '../components/Page'
import { callApi } from '../lib/api'
import { useAuth, useProfile } from '../lib/auth'
import { useApp } from '../lib/store'
import { errMsg, supabase, type Profile } from '../lib/supabase'

export default function Settings() {
  const p = useProfile()
  const { role, session, updateProfile, signOut } = useAuth()
  const { showToast } = useApp()
  const [visibility, setVisibility] = useState<Profile['visibility']>(p.visibility)
  const [busy, setBusy] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [confirmEmail, setConfirmEmail] = useState('')
  const canDelete = role === 'student'

  const savePrefs = async () => {
    setBusy(true)
    try {
      await updateProfile({ visibility })
      showToast('Preferences saved.')
    } catch (e) {
      showToast(`Could not save: ${errMsg(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const changePassword = async () => {
    if (pw.next.length < 10) return showToast('Use at least 10 characters for your password.')
    if (pw.next !== pw.confirm) return showToast('Passwords do not match.')
    const email = session?.user.email
    if (!email) return
    setBusy(true)
    try {
      // Someone at an unlocked screen must not be able to take over the account.
      const { error: wrong } = await supabase.auth.signInWithPassword({ email, password: pw.current })
      if (wrong) throw new Error('Your current password is not correct.')
      const { error } = await supabase.auth.updateUser({ password: pw.next })
      if (error) throw error
      await supabase.auth.signOut({ scope: 'others' })
      setPw({ current: '', next: '', confirm: '' })
      showToast('Password updated. Other devices were signed out.')
    } catch (e) {
      showToast(`Could not change password: ${errMsg(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const deleteAccount = async () => {
    setBusy(true)
    try {
      await callApi('account', { action: 'delete', confirm_email: confirmEmail })
      await supabase.auth.signOut({ scope: 'local' })
      window.location.assign('/')
    } catch (e) {
      showToast(errMsg(e))
      setBusy(false)
    }
  }

  const dirty = visibility !== p.visibility

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

      <Card title="Profile visibility">
        <div className="space-y-2">
          {([['college', 'My placement cell, and recruiters of drives I apply to'], ['recruiters', 'My placement cell and recruiters (same as above today)'], ['private', 'Only me and my placement cell (hidden from recruiters, even for drives I apply to)']] as const).map(([v, label]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2 py-2 hover:bg-[#f7f8fa]">
              <input type="radio" name="vis" checked={visibility === v} onChange={() => setVisibility(v)} className="h-4 w-4 accent-[#6d4aff]" />
              <span className="text-[12.5px] text-ink-soft">{label}</span>
            </label>
          ))}
        </div>
        <button
          onClick={savePrefs}
          disabled={busy || !dirty}
          className="mt-3 rounded-[9px] bg-brand px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          Save preferences
        </button>
      </Card>

      <Card title="Security">
        <div className="grid max-w-[520px] grid-cols-1 gap-3 sm:grid-cols-2">
          {(['current', 'next', 'confirm'] as const).map((k) => (
            <label key={k} className="block">
              <span className="text-[11.5px] font-medium text-ink-mute">{k === 'current' ? 'Current password' : k === 'next' ? 'New password' : 'Confirm password'}</span>
              <input
                type="password"
                autoComplete={k === 'current' ? 'current-password' : 'new-password'}
                value={pw[k]}
                onChange={(e) => setPw({ ...pw, [k]: e.target.value })}
                className="mt-1 h-[36px] w-full rounded-[9px] border border-line bg-white px-3 text-[12.5px] outline-none focus:border-[#d5cbff]"
              />
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={changePassword} disabled={busy || !pw.next || !pw.current} className="rounded-[9px] border border-[#d5cbff] px-4 py-2 text-[12.5px] font-semibold text-brand-dark hover:bg-[#faf8ff] disabled:opacity-50">
            Change password
          </button>
          <button onClick={signOut} className="ml-auto rounded-[9px] border border-[#fbd5d1] px-4 py-2 text-[12.5px] font-semibold text-[#d92d20] hover:bg-[#fef3f2]">
            Sign out
          </button>
        </div>
      </Card>

      {canDelete && (
        <Card title="Delete your account">
          <p className="text-[12.5px] text-ink-soft">This removes your profile, evidence, applications, resume and login, and your entry on your college's roster. It cannot be undone. The audit log keeps past changes under an anonymous account id.</p>
          <label className="mt-3 block max-w-[320px]">
            <span className="text-[11.5px] font-medium text-ink-mute">Type your sign-in email to confirm</span>
            <input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} autoComplete="off" className="mt-1 h-[36px] w-full rounded-[9px] border border-line bg-white px-3 text-[12.5px] outline-none focus:border-[#fbd5d1]" />
          </label>
          <button
            onClick={deleteAccount}
            disabled={busy || confirmEmail.trim().toLowerCase() !== session?.user.email?.toLowerCase()}
            className="mt-3 rounded-[9px] border border-[#fbd5d1] px-4 py-2 text-[12.5px] font-semibold text-[#d92d20] hover:bg-[#fef3f2] disabled:opacity-50"
          >
            Delete my account
          </button>
        </Card>
      )}
    </Page>
  )
}
