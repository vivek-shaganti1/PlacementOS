import { useEffect, useState } from 'react'
import { Aurora } from '../components/effects/Aurora'
import { LogoMark } from '../components/Logo'
import { CodeInput, TotpSetup } from '../components/TotpSetup'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

/**
 * Shown to platform admins and placement cells whose session has only a password. Their powers count only after a code
 * from an authenticator app (the database enforces this; see 20261113000000_admin_two_factor.sql). An admin with an
 * app enters a code; one without is walked through adding one.
 */
export default function TwoFactor() {
  const { session, signOut } = useAuth()
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => setFactorId(data?.totp.find((f) => f.status === 'verified')?.id ?? null))
  }, [])

  const verify = async () => {
    if (!factorId || code.length !== 6) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    setBusy(false)
    // On success the session becomes two-factor and the app opens by itself.
    if (error) {
      setCode('')
      setError('That code did not match. Use the newest code from your authenticator app.')
    }
  }

  return (
    <main id="main" className="relative grid min-h-[calc(100svh/var(--z))] place-items-center px-4 py-10 text-[13px] text-ink-mute">
      <Aurora />
      <div className="card relative z-10 w-full max-w-[420px] p-7 text-left">
        <LogoMark size={40} />
        <h1 className="mt-4 text-[18px] font-semibold text-ink">{factorId === null ? 'Set up two-factor sign-in' : 'Enter your sign-in code'}</h1>
        <p id="totp-help" className="mt-1.5 leading-relaxed">
          {factorId === null
            ? 'Admin accounts hold every student\'s records, so they need a code from an authenticator app as well as the password. This takes a minute, once.'
            : <>Open your authenticator app and enter the code for PlacementIQ (<b className="text-ink">{session?.user.email}</b>).</>}
        </p>
        <div className="mt-5">
          {factorId === undefined && <p role="status">Checking your account…</p>}
          {factorId === null && <TotpSetup onDone={() => undefined} />}
          {factorId && (
            <form onSubmit={(e) => { e.preventDefault(); void verify() }} className="space-y-3">
              <CodeInput value={code} onChange={setCode} />
              {error && <p role="alert" className="text-[12.5px] text-[#b42318]">{error}</p>}
              <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full disabled:opacity-50">
                {busy ? 'Checking…' : 'Continue'}
              </button>
            </form>
          )}
        </div>
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-4 text-[12px]">
          <span>Lost your phone? Ask the PlacementIQ platform owner to reset it.</span>
          <button onClick={signOut} className="shrink-0 whitespace-nowrap font-semibold text-brand-dark hover:underline">Sign out</button>
        </div>
      </div>
    </main>
  )
}
