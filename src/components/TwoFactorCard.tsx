import { useCallback, useEffect, useState } from 'react'
import { Card } from './Page'
import { TotpSetup } from './TotpSetup'
import { errMsg, supabase } from '../lib/supabase'

type Factor = { id: string; friendly_name?: string; created_at: string }

/**
 * Settings for admins: the authenticator apps on this account. A second app is the backup if a phone is lost; the last
 * one cannot be removed here, because admin accounts must always have one.
 */
export function TwoFactorCard() {
  const [factors, setFactors] = useState<Factor[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors((data?.totp ?? []).filter((f) => f.status === 'verified'))
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const remove = async (id: string) => {
    setError(null)
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
    if (error) return setError(errMsg(error))
    await load()
  }

  return (
    <Card title="Two-factor sign-in">
      <p className="text-[12.5px] leading-relaxed text-ink-mute">
        Admin accounts sign in with a password and a code from an authenticator app. Add a second app (for example on another
        phone) so a lost phone does not lock you out.
      </p>
      <ul className="mt-3 space-y-2">
        {(factors ?? []).map((f) => (
          <li key={f.id} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2 text-[12.5px]">
            <span className="text-ink">{f.friendly_name || 'Authenticator app'} <span className="text-ink-mute">· added {new Date(f.created_at).toLocaleDateString('en-IN')}</span></span>
            {factors && factors.length > 1 && (
              <button onClick={() => void remove(f.id)} className="font-semibold text-[#b42318] hover:underline" aria-label={`Remove ${f.friendly_name || 'authenticator app'}`}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-[12.5px] text-[#b42318]">{error}</p>}
      <div className="mt-3 max-w-[360px]">
        {adding ? (
          <TotpSetup onDone={() => { setAdding(false); void load() }} />
        ) : (
          <button onClick={() => setAdding(true)} className="rounded-[9px] border border-[#d5cbff] px-4 py-2 text-[12.5px] font-semibold text-brand-dark hover:bg-[#faf8ff]">
            Add another authenticator app
          </button>
        )}
      </div>
    </Card>
  )
}
