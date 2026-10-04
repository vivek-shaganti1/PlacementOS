import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Aurora } from '../components/Page'
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
    <div className="relative min-h-screen overflow-hidden">
      <Aurora />
      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1120px] grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-[1.05fr_1fr]">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="glass-dark relative hidden overflow-hidden rounded-[28px] p-10 text-white lg:block"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[oklch(0.6_0.22_285)] opacity-40 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-[oklch(0.75_0.12_200)] opacity-30 blur-[80px]" />
          <Link to="/" className="relative inline-block"><Logo light /></Link>
          <h2 className="relative mt-12 font-display text-[44px] leading-[1.02] tracking-[-0.01em]">
            Know exactly where you stand <span className="italic text-white/70">before</span> the drive opens.
          </h2>
          <p className="relative mt-4 max-w-[420px] text-[14px] leading-[1.6] text-white/70">
            Your academics, resume, GitHub and coding profiles, scored against 66 recruiters, with the next best step for each one.
          </p>
          <div className="relative mt-10 grid grid-cols-3 gap-3">
            {[['66', 'companies scored'], ['4', 'coding platforms synced'], ['6', 'ATS checks per resume']].map(([n, l], i) => (
              <motion.div
                key={l}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-[16px] border border-white/10 bg-white/[0.06] p-4"
              >
                <p className="text-[28px] font-semibold tracking-[-0.03em]">{n}</p>
                <p className="mt-1 text-[11.5px] text-white/60">{l}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-[420px]"
        >
          <div className="mb-6 flex justify-center lg:hidden"><Link to="/"><Logo /></Link></div>
          <form onSubmit={submit} className="glass-strong space-y-4 rounded-[26px] p-7">
            <div>
              <AnimatePresence mode="wait">
                <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                  <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">{title}</h1>
                  <p className="mt-1 text-[12.5px] text-ink-mute">{sub}</p>
                </motion.div>
              </AnimatePresence>
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

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="rounded-[11px] border border-[#fbd5d1] bg-[#fef3f2]/90 px-3 py-2 text-[12px] text-[#d92d20]">
                  {error}
                </motion.p>
              )}
              {info && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="rounded-[11px] border border-[#c9f0d9] bg-[#ecfdf3]/90 px-3 py-2 text-[12px] text-[#0d9a5b]">
                  {info}
                </motion.p>
              )}
            </AnimatePresence>

            <button disabled={busy} className="btn-primary h-[42px] w-full text-[13px]">
              {busy ? 'Please wait…' : cta}
            </button>

            <div className="flex items-center justify-between pt-1 text-[12px]">
              {mode === 'signin' && (
                <>
                  <button type="button" onClick={() => switchTo('forgot')} className="text-ink-mute hover:underline">
                    Forgot password?
                  </button>
                  <button type="button" onClick={() => switchTo('signup')} className="font-semibold text-brand-dark hover:underline">
                    Create an account
                  </button>
                </>
              )}
              {(mode === 'signup' || mode === 'forgot') && (
                <button type="button" onClick={() => switchTo('signin')} className="font-semibold text-brand-dark hover:underline">
                  ← Back to sign in
                </button>
              )}
            </div>
          </form>
          <p className="mt-4 text-center text-[11.5px] text-ink-faint">
            <Link to="/" className="hover:underline">← Back to the PlacementIQ homepage</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
