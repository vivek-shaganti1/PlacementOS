import { useEffect, useState } from 'react'
import { errMsg, supabase } from '../lib/supabase'

const INPUT = 'mt-1 h-[40px] w-full rounded-[10px] border border-line bg-white px-3 text-center font-mono text-[17px] tracking-[0.3em] outline-none focus:border-[#d5cbff]'

/** Six digits from an authenticator app. */
export function CodeInput({ value, onChange, label = 'Code from your authenticator app' }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <label className="block text-left">
      <span className="text-[11.5px] font-medium text-ink-mute">{label}</span>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className={INPUT}
        aria-describedby="totp-help"
      />
    </label>
  )
}

/**
 * Adds an authenticator app (TOTP) to the signed-in account: shows a QR code and the key, then checks one code. A
 * successful check also upgrades the current session to two-factor, so nothing else needs to happen afterwards.
 */
export function TotpSetup({ onDone }: { onDone: () => void }) {
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    ;(async () => {
      // An earlier attempt that was never confirmed would block a new one; it was never usable, so it is removed.
      const { data: list } = await supabase.auth.mfa.listFactors()
      for (const f of list?.all ?? []) if (f.factor_type === 'totp' && f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id })
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Authenticator ${new Date().toISOString().slice(0, 16)}` })
      if (!live) return
      if (error || !data) return setError(errMsg(error) || 'Could not start the setup. Try again.')
      setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
    })()
    return () => {
      live = false
    }
  }, [])

  const verify = async () => {
    if (!factor || code.length !== 6) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
    setBusy(false)
    if (error) return setError('That code did not match. Check the time on your phone and try the newest code.')
    onDone()
  }

  if (error && !factor) return <p role="alert" className="text-[12.5px] text-[#b42318]">{error}</p>
  if (!factor) return <p role="status" className="text-[12.5px] text-ink-mute">Preparing your setup…</p>
  return (
    <form onSubmit={(e) => { e.preventDefault(); void verify() }} className="space-y-3 text-left">
      <ol className="list-decimal space-y-1 pl-5 text-[12.5px] leading-relaxed text-ink-soft">
        <li>Open an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Authy or similar).</li>
        <li>Scan this code, or enter the key below.</li>
        <li>Type the six-digit code the app shows.</li>
      </ol>
      <img src={factor.qr} alt="QR code to add PlacementIQ to your authenticator app" width={176} height={176} className="mx-auto rounded-[12px] bg-white p-2 ring-1 ring-line" />
      <p className="text-center text-[11.5px] text-ink-mute">
        Key: <code className="select-all break-all font-mono text-[12px] text-ink" data-testid="totp-secret">{factor.secret}</code>
      </p>
      <CodeInput value={code} onChange={setCode} />
      {error && <p role="alert" className="text-[12.5px] text-[#b42318]">{error}</p>}
      <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full disabled:opacity-50">
        {busy ? 'Checking…' : 'Turn on two-factor sign-in'}
      </button>
    </form>
  )
}
