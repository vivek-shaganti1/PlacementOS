import { useId, useState } from 'react'
import { PLANS, usd } from '../../lib/pricing'
import { openContact } from './ContactDialog'
import { Accent, Heading, Rise } from './Section'

const SALES_EMAIL = import.meta.env.VITE_SALES_EMAIL
const cta = (name: string) => (name === 'Enterprise' ? 'Talk to us' : name === 'Trial' ? 'Start a trial' : `Choose ${name}`)
const n0 = (n: number) => n.toLocaleString('en-IN')

/** The plans, and what each would cost this college. Every number comes from src/lib/pricing.ts. */
export function Plans() {
  const id = useId()
  const [n, setN] = useState(1000)
  return (
    <>
      <Heading n="05" label="Pricing" body="Each college gets its own private placement cell, its own roster and its own drives. Only students your college adds can sign in.">
        Colleges subscribe. <Accent>Students never pay.</Accent>
      </Heading>
      <Rise>
        <div className="glass mt-10 grid items-center gap-x-10 gap-y-2 rounded-[24px] px-6 py-5 sm:grid-cols-[auto_1fr_auto] sm:px-7">
          <label htmlFor={id} className="text-[15px] font-medium text-ink">Students at your college</label>
          <input id={id} type="range" min={100} max={6000} step={100} value={n} aria-valuetext={`${n0(n)} students`} onChange={(e) => setN(Number(e.target.value))} style={{ ['--fill' as string]: `${((n - 100) / 5900) * 100}%` }} className="lq-range" />
          <span aria-hidden className="text-[24px] font-semibold tabular-nums tracking-[-0.03em] text-ink sm:min-w-[84px] sm:text-right">{n0(n)}</span>
        </div>
      </Rise>
      <Rise>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.values(PLANS).map((p) => {
            // Each paid plan starts at a size; below it, the total shown is the total at that size, and says so.
            const seats = Math.max(n, p.key === 'enterprise' ? 3000 : p.key === 'trial' ? 0 : 500)
            const trial = p.key === 'trial'
            const action = `${p.featured ? 'btn-ink' : 'btn-glass'} mt-7 w-full !h-[46px] justify-center !text-[14px]`
            return (
              <div key={p.key} className={`transition-transform duration-300 hover:-translate-y-1 ${p.featured ? 'gradient-border rounded-[28px] shadow-[0_24px_60px_oklch(0.5_0.2_285/.22)]' : ''}`}>
                <div className={`${p.featured ? 'glass-strong plan-tint' : 'glass'} flex h-full flex-col rounded-[28px] p-7`}>
                  <div className="flex min-h-[28px] items-center justify-between">
                    <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{p.name}</h3>
                    {p.featured && <span className="rounded-full bg-brand-tint px-3 py-1 text-[12px] font-semibold text-brand-dark">Recommended</span>}
                  </div>
                  <p className="mt-6 text-[42px] font-semibold leading-none tracking-[-0.045em] text-ink">
                    {p.key === 'enterprise' && <span className="mr-1.5 text-[16px] font-medium tracking-normal text-ink-soft">from</span>}
                    {usd(p.pricePerSeat)}
                  </p>
                  <p className="mt-2.5 text-[14px] text-ink-soft">{trial ? '30 days' : 'per student / year'}</p>
                  <p className="mt-1 text-[14px] leading-[1.5] text-ink-soft xl:min-h-[42px]">{p.platformFee ? `+ ${usd(p.platformFee)} platform fee / year · ${p.seats}` : `No platform fee · ${p.seats}`}</p>
                  <p className="mt-4 border-y border-line py-3 text-[14px] leading-[1.5] text-ink-soft xl:min-h-[68px]">
                    {trial ? 'For one batch, before you commit.' : <><b className="font-semibold text-ink">{p.key === 'enterprise' ? 'From ' : ''}{usd(seats * p.pricePerSeat + p.platformFee)} a year</b> for {n0(seats)} students</>}
                  </p>
                  <p className="mt-4 text-[14.5px] leading-[1.55] text-ink-soft xl:min-h-[68px]">{p.blurb}</p>
                  <ul className="mt-5 flex-1 space-y-3 text-[14.5px] leading-[1.45] text-ink-soft">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-3">
                        <span aria-hidden className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-tint text-[10px] font-bold text-brand-dark">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {SALES_EMAIL ? (
                    <a href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`PlacementIQ ${p.name} plan`)}`} className={action}>{cta(p.name)}</a>
                  ) : (
                    <button type="button" onClick={() => openContact(`${p.name} plan`)} className={action}>{cta(p.name)}</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Rise>
      <p className="mt-6 max-w-[980px] text-[13.5px] leading-[1.6] text-ink-soft">
        Prices in US dollars, excluding applicable taxes. Seats are counted by students on your roster. The platform fee covers hosting, security and onboarding for your college. AI actions are assistant replies, resume analyses and job-description matches.
      </p>
    </>
  )
}
