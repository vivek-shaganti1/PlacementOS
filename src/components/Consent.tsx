import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { giveConsent, hasConsented, type Age } from '../lib/consent'
import { errMsg } from '../lib/supabase'

export type ConsentState = { agreed: boolean; age: Age | '' }

/** The agreement itself: the notice, and the person's own statement about their age. Used at set-up and when the notice changes. */
export function ConsentFields({ value, onChange }: { value: ConsentState; onChange: (v: ConsentState) => void }) {
  return (
    <fieldset className="space-y-2.5 rounded-[14px] border border-line bg-white/70 p-3.5 text-[12.5px] text-ink-soft">
      <legend className="sr-only">Privacy</legend>
      <label className="flex min-h-6 cursor-pointer items-start gap-2.5">
        <input type="checkbox" checked={value.agreed} onChange={(e) => onChange({ ...value, agreed: e.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-[#6d4aff]" />
        <span>
          I have read the <Link to="/privacy" target="_blank" className="font-medium text-brand-dark underline">privacy policy</Link> and agree to PlacementIQ using my profile, resume and connected accounts for my college's placements, including AI processing by Groq when I use an AI feature.
        </span>
      </label>
      <label className="flex min-h-6 cursor-pointer items-center gap-2.5">
        <input type="radio" name="age" checked={value.age === 'adult'} onChange={() => onChange({ ...value, age: 'adult' })} className="h-4 w-4 accent-[#6d4aff]" /> I am 18 or older
      </label>
      <label className="flex min-h-6 cursor-pointer items-center gap-2.5">
        <input type="radio" name="age" checked={value.age === 'guardian'} onChange={() => onChange({ ...value, age: 'guardian' })} className="h-4 w-4 accent-[#6d4aff]" /> I am under 18 and my parent or guardian has agreed through my college
      </label>
    </fieldset>
  )
}

/** Shown to students who set up before this notice, until they agree. It does not block the page. */
export function ConsentPrompt({ userId }: { userId: string }) {
  const [ask, setAsk] = useState(false)
  const [value, setValue] = useState<ConsentState>({ agreed: false, age: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    hasConsented(userId).then((ok) => live && setAsk(ok === false))
    return () => {
      live = false
    }
  }, [userId])
  if (!ask) return null
  const save = async () => {
    if (!value.agreed || !value.age) return setError('Tick the agreement and choose one of the two age options.')
    setBusy(true)
    const failed = await giveConsent(userId, value.age)
    setBusy(false)
    if (failed) return setError(errMsg(failed))
    setAsk(false)
  }
  return (
    <section aria-label="Privacy policy update" className="card p-4">
      <p className="text-[13.5px] font-semibold text-ink">Our privacy policy has changed</p>
      <p className="mt-1 text-[12.5px] text-ink-mute">Please read it and tell us you agree.</p>
      <div className="mt-3"><ConsentFields value={value} onChange={setValue} /></div>
      {error && <p role="alert" className="mt-2 text-[12px] text-[#b42318]">{error}</p>}
      <button onClick={save} disabled={busy} className="btn-primary mt-3">{busy ? 'Saving…' : 'Agree and continue'}</button>
    </section>
  )
}
