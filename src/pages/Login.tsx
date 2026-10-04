import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../lib/auth'
import { errMsg, supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup' | 'forgot' | 'reset'

const input = 'field mt-1 h-[42px] text-[13px]'

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
    <div className="min-h-screen bg-paper">
      <div className="mx-auto grid min-h-screen max-w-[1080px] grid-cols-1 items-stretch gap-0 px-0 lg:grid-cols-[1fr_1fr] lg:px-6 lg:py-10">
        <div className="glass-dark hidden flex-col justify-between p-10 lg:flex">
          <Link to="/" className="inline-block"><Logo light /></Link>
          <div>
            <h2 className="font-display text-[42px] font-medium leading-[1.08] text-[#FBF9F4]">
              Know where you stand before the drive opens.
            </h2>
            <p className="mt-4 max-w-[400px] text-[14px] leading-[1.7] text-[#FBF9F4]/75">
              Your academics, resume, GitHub and coding profiles, scored against every recruiter your college works with.
            </p>
          </div>
          <ol className="space-y-3 border-t border-[#FBF9F4]/15 pt-6 text-[13px] text-[#FBF9F4]/80">
            {['Eligibility for 66 recruiters, recalculated whenever your profile changes', 'Resume analysis with six measured ATS checks', 'Drives from your placement cell, matched to you'].map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="figure text-[#FBF9F4]/50">{String(i + 1).padStart(2, '0')}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex items-center justify-center bg-surface px-5 py-10 lg:border lg:border-l-0 lg:border-rule">
          <div className="w-full max-w-[380px]">
            <div className="mb-8 lg:hidden"><Link to="/"><Logo /></Link></div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h1 className="font-display text-[30px] font-medium leading-tight text-ink">{title}</h1>
                <p className="mt-1 text-[13px] text-ink-mute">{sub}</p>
              </div>

              {mode === 'signup' && (
                <label className="block">
                  <span className="text-[12px] font-medium text-ink-soft">Full name</span>
                  <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={input} />
                </label>
              )}

              {mode !== 'reset' && (
                <label className="block">
                  <span className="text-[12px] font-medium text-ink-soft">Email</span>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={input} />
                </label>
              )}

              {mode !== 'forgot' && (
                <label className="block">
                  <span className="text-[12px] font-medium text-ink-soft">{mode === 'reset' ? 'New password' : 'Password'}</span>
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

              {error && <p className="border border-[#C8C0B0] bg-surface-2 px-3 py-2 text-[12.5px] text-[#9C3526]">{error}</p>}
              {info && <p className="border border-[#C8C0B0] bg-surface-2 px-3 py-2 text-[12.5px] text-[#0A6B50]">{info}</p>}

              <button disabled={busy} className="btn-primary h-[42px] w-full text-[13px]">
                {busy ? 'Please wait' : cta}
              </button>

              {mode === 'signup' && (
                <p className="text-[11.5px] leading-[1.6] text-ink-mute">
                  By creating an account you agree to the <Link to="/terms" className="text-brand underline">Terms of Service</Link> and{' '}
                  <Link to="/privacy" className="text-brand underline">Privacy Policy</Link>.
                </p>
              )}

              <div className="flex items-center justify-between border-t border-rule pt-4 text-[12.5px]">
                {mode === 'signin' && (
                  <>
                    <button type="button" onClick={() => switchTo('forgot')} className="text-ink-mute hover:underline">Forgot password?</button>
                    <button type="button" onClick={() => switchTo('signup')} className="font-semibold text-brand hover:underline">Create an account</button>
                  </>
                )}
                {(mode === 'signup' || mode === 'forgot') && (
                  <button type="button" onClick={() => switchTo('signin')} className="font-semibold text-brand hover:underline">Back to sign in</button>
                )}
              </div>
            </form>
            <p className="mt-8 flex gap-4 text-[12px] text-ink-faint">
              <Link to="/" className="hover:underline">Home</Link>
              <Link to="/terms" className="hover:underline">Terms</Link>
              <Link to="/privacy" className="hover:underline">Privacy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
