import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { errMsg, supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup' | 'forgot' | 'reset'

const input =
  'mt-1 h-[38px] w-full rounded-[9px] border border-line bg-white px-3 text-[13px] outline-none focus:border-[#d5cbff] focus:ring-4 focus:ring-brand/10'

export default function Login({ initialMode = 'signin' }: { initialMode?: Mode }) {
  const { clearRecovery } = useAuth()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const switchTo = (m: Mode) => {
    setMode(m)
    setError('')
    setInfo('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else if (mode === 'signup') {
        if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        if (!data.session) {
          setInfo('Account created. Check your inbox and click the confirmation link, then sign in.')
          setMode('signin')
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setInfo('If an account exists for that email, a reset link is on its way.')
      } else {
        if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        clearRecovery()
        window.history.replaceState(null, '', '/dashboard')
      }
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const titles: Record<Mode, [string, string, string]> = {
    signin: ['Welcome back', 'Sign in to see your eligibility stacks.', 'Sign in'],
    signup: ['Create your account', 'Your profile powers every match on PlacementIQ.', 'Create account'],
    forgot: ['Reset your password', 'We will email you a link to choose a new one.', 'Send reset link'],
    reset: ['Choose a new password', 'Enter a new password for your account.', 'Update password'],
  }
  const [title, sub, cta] = titles[mode]

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-brand text-[18px] font-bold text-white shadow-[0_2px_8px_rgba(109,74,255,.35)]">
            P
          </span>
          <p className="text-[20px] font-bold tracking-[-.02em] text-brand-dark">PlacementIQ</p>
        </div>

        <form onSubmit={submit} className="card space-y-3.5 p-6">
          <div>
            <h1 className="text-[18px] font-bold text-ink">{title}</h1>
            <p className="mt-1 text-[12.5px] text-ink-mute">{sub}</p>
          </div>

          {mode === 'signup' && (
            <label className="block">
              <span className="text-[11.5px] font-medium text-ink-mute">Full name</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={input} />
            </label>
          )}

          {mode !== 'reset' && (
            <label className="block">
              <span className="text-[11.5px] font-medium text-ink-mute">Email</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={input} />
            </label>
          )}

          {mode !== 'forgot' && (
            <label className="block">
              <span className="text-[11.5px] font-medium text-ink-mute">{mode === 'reset' ? 'New password' : 'Password'}</span>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={mode === 'signin' ? undefined : 8}
                className={input}
              />
            </label>
          )}

          {error && <p className="rounded-[9px] border border-[#fbd5d1] bg-[#fef3f2] px-3 py-2 text-[12px] text-[#d92d20]">{error}</p>}
          {info && <p className="rounded-[9px] border border-[#c9f0d9] bg-[#ecfdf3] px-3 py-2 text-[12px] text-[#0d9a5b]">{info}</p>}

          <button
            disabled={busy}
            className="h-[38px] w-full rounded-[9px] bg-brand text-[13px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Please wait…' : cta}
          </button>

          <div className="flex items-center justify-between pt-1 text-[12px]">
            {mode === 'signin' && (
              <>
                <button type="button" onClick={() => switchTo('forgot')} className="text-ink-mute hover:underline">
                  Forgot password?
                </button>
                <button type="button" onClick={() => switchTo('signup')} className="font-medium text-brand-dark hover:underline">
                  Create an account
                </button>
              </>
            )}
            {(mode === 'signup' || mode === 'forgot') && (
              <button type="button" onClick={() => switchTo('signin')} className="font-medium text-brand-dark hover:underline">
                ← Back to sign in
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
