import { useId, useState } from 'react'
import { PLANS, usd } from '../../lib/pricing'
import { openContact } from './ContactDialog'

const SALES_EMAIL = import.meta.env.VITE_SALES_EMAIL
const cta = (name: string) => (name === 'Enterprise' ? 'Talk to us' : name === 'Trial' ? 'Start a trial' : `Choose ${name}`)

/** The plans, and what each would cost this college. Every number comes from src/lib/pricing.ts. */
export function Plans() {
  const id = useId()
  const [n, setN] = useState(1000)
  return (
    <>
      <div className="mt-10 max-w-[560px]">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={id} className="text-[16px] font-medium text-ink">Students at your college</label>
          <span aria-hidden className="text-[24px] font-semibold tabular-nums tracking-[-0.03em] text-ink">{n.toLocaleString('en-IN')}</span>
        </div>
        <input id={id} type="range" min={100} max={6000} step={100} value={n} aria-valuetext={`${n.toLocaleString('en-IN')} students`} onChange={(e) => setN(Number(e.target.value))} style={{ ['--fill' as string]: `${((n - 100) / 5900) * 100}%` }} className="lq-range mt-2" />
      </div>
      <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {Object.values(PLANS).map((p) => {
          // Each paid plan starts at a size; below it, the price shown is the price at that size, and says so.
          const least = p.key === 'enterprise' ? 3000 : p.key === 'trial' ? 0 : 500
          const seats = Math.max(n, least)
          return (
            <div key={p.key} className="flex flex-col border-t-2 border-ink pt-5">
              <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{p.name}</h3>
              <p className="mt-1 text-[14.5px] leading-[1.5] text-ink-soft lg:min-h-[66px]">{p.blurb}</p>
              {p.key === 'trial' ? (
                <p className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-ink">Free <span className="text-[14px] font-normal tracking-normal text-ink-mute">for 30 days</span></p>
              ) : (
                <p className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-ink">
                  {p.key === 'enterprise' && <span className="mr-1 text-[14px] font-normal tracking-normal text-ink-mute">from</span>}
                  {usd(seats * p.pricePerSeat + p.platformFee)} <span className="text-[14px] font-normal tracking-normal text-ink-mute">a year{seats !== n && ` for ${seats.toLocaleString('en-IN')} students`}</span>
                </p>
              )}
              <p className="mt-1 text-[13.5px] leading-[1.5] text-ink-mute">
                {p.key === 'trial' ? p.seats : <>{usd(p.pricePerSeat)} per student + {usd(p.platformFee)} platform fee. {p.seats}.</>}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-[14.5px] leading-[1.5] text-ink-soft">
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              {SALES_EMAIL ? (
                <a href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`PlacementIQ ${p.name} plan`)}`} className="lq-btn mt-6 self-start">{cta(p.name)}</a>
              ) : (
                <button type="button" onClick={() => openContact(`${p.name} plan`)} className="lq-btn mt-6 self-start">{cta(p.name)}</button>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-8 max-w-[820px] text-[13.5px] leading-[1.6] text-ink-mute">
        Prices in US dollars, excluding applicable taxes. Seats are counted by students on your roster. The platform fee covers hosting, security and onboarding. AI actions are assistant replies, resume analyses and job-description matches.
      </p>
    </>
  )
}
