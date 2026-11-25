import { LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { useId, useMemo, useState } from 'react'
import { skillShort } from '../../lib/branches'
import { motionConfig } from '../../lib/motion'
import type { Bucket, Company } from '../../data/types'
import { TweenNumber } from '../motion/TweenNumber'
import { bestFix, DEMO_BRANCHES, demoSkills, runDemo, startProfile, type DemoBranch, type DemoProfile } from './demo'

const GROUPS: { key: Bucket; name: string; says: string; color: string; ink: string }[] = [
  { key: 'eligible', name: 'Eligible', says: 'Apply now', color: '#12b76a', ink: '#05603a' },
  { key: 'nearly', name: 'Nearly', says: 'A small gap or two', color: '#f79009', ink: '#93370d' },
  { key: 'canBecome', name: 'Can become', says: 'Reachable with work', color: '#2e90fa', ink: '#1849a9' },
  { key: 'notEligible', name: 'Not yet', says: 'Far off today', color: '#f04438', ink: '#b42318' },
]
const SHOWN = 7

function Slider({ label, value, min, max, step, show, onChange }: { label: string; value: number; min: number; max: number; step: number; show: string; onChange: (v: number) => void }) {
  const id = useId()
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13.5px] font-medium text-ink">{label}</label>
        <span aria-hidden className="text-[13.5px] font-semibold tabular-nums text-ink">{show}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={show} onChange={(e) => onChange(Number(e.target.value))} style={{ ['--fill' as string]: `${((value - min) / (max - min)) * 100}%` }} className="lq-range mt-1" />
    </div>
  )
}

function Choice({ label, value, options, onChange }: { label: string; value: number; options: number[]; onChange: (v: number) => void }) {
  return (
    <fieldset>
      <legend className="text-[13.5px] font-medium text-ink">{label}</legend>
      <div className="mt-1.5 flex gap-1">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)} className={`h-9 flex-1 rounded-[10px] text-[13px] font-semibold transition-colors ${value === o ? 'bg-ink text-white' : 'bg-white/80 text-ink-soft hover:bg-white'}`}>
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** Why one company is in its group: the engine's own checks, unmet ones first. */
function Why({ c }: { c: Company }) {
  const g = GROUPS.find((x) => x.key === c.bucket)!
  const unmet = c.criteria.filter((x) => !x.met)
  const met = c.criteria.length - unmet.length
  return (
    <div>
      <p className="text-[13px] text-ink-soft">Why this answer</p>
      <p className="mt-0.5 text-[19px] font-semibold tracking-[-0.02em] text-ink">
        {c.name}: <span style={{ color: g.ink }}>{g.name.toLowerCase()}</span>
      </p>
      <ul className="mt-3 space-y-1.5 text-[13.5px]">
        {unmet.slice(0, 4).map((x) => (
          <li key={x.label} className="flex items-baseline justify-between gap-4">
            <span className="text-ink-soft">{skillShort(x.label)}</span>
            <span className="whitespace-nowrap text-ink"><span className="font-semibold">{x.yours}</span> <span className="text-ink-soft">of {x.required}</span></span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[13px] text-ink-soft">
        {unmet.length === 0 ? `All ${met} checks met.` : `${met} other ${met === 1 ? 'check' : 'checks'} met${unmet.length > 4 ? `, ${unmet.length - 4} more to fix` : ''}.`}
      </p>
    </div>
  )
}

export function TryIt() {
  const reduce = useReducedMotion()
  const [p, setP] = useState<DemoProfile>(() => startProfile('cse'))
  const [picked, setPicked] = useState<string | null>(null)
  const skills = useMemo(() => demoSkills(p.branch), [p.branch])
  const companies = useMemo(() => runDemo(p), [p])
  const fix = useMemo(() => bestFix(p, companies), [p, companies])
  const by = (k: Bucket) => companies.filter((c) => c.bucket === k)
  const open = by('eligible').length
  // Until one is picked: the best match that is not open yet, the most interesting question on the board.
  const chosen = companies.find((c) => c.id === picked) ?? companies.find((c) => c.bucket !== 'eligible') ?? companies[0]
  const set = (patch: Partial<DemoProfile>) => setP((x) => ({ ...x, ...patch }))
  const branchId = useId()

  return (
    <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div data-lq="0.74" className="lq rounded-[28px] p-5 sm:p-6">
        {/* On a phone the board is below the controls, so the result travels with them. */}
        <div aria-hidden className="sticky top-[76px] z-10 -mx-2 mb-4 rounded-[16px] bg-white px-3 py-2.5 shadow-card lg:hidden">
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
            {GROUPS.map((g) => <span key={g.key} style={{ flexGrow: by(g.key).length, background: g.color, transition: reduce ? undefined : 'flex-grow 280ms cubic-bezier(0.16, 1, 0.3, 1)' }} />)}
          </div>
          <div className="mt-1.5 flex justify-between text-[12px] font-medium">
            {GROUPS.map((g) => <span key={g.key} style={{ color: g.ink }}>{by(g.key).length} {g.name.toLowerCase()}</span>)}
          </div>
        </div>
        <label htmlFor={branchId} className="text-[13.5px] font-medium text-ink">Branch</label>
        <select
          id={branchId}
          value={p.branch}
          onChange={(e) => {
            setPicked(null)
            setP(startProfile(e.target.value as DemoBranch['id']))
          }}
          className="mt-1.5 h-11 w-full rounded-[12px] border border-line bg-white/90 px-3 text-[14.5px] font-medium text-ink"
        >
          {DEMO_BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <div className="mt-5 space-y-4">
          <Slider label="CGPA" value={p.cgpa} min={5} max={10} step={0.1} show={p.cgpa.toFixed(1)} onChange={(cgpa) => set({ cgpa })} />
          {skills.map((s) => (
            <Slider key={s} label={skillShort(s)} value={p.levels[s]} min={0} max={100} step={1} show={String(p.levels[s])} onChange={(v) => set({ levels: { ...p.levels, [s]: v } })} />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Choice label="Backlogs" value={p.backlogs} options={[0, 1, 2]} onChange={(backlogs) => set({ backlogs })} />
          <Choice label="Internships" value={p.internships} options={[0, 1, 2]} onChange={(internships) => set({ internships })} />
        </div>
        <p className="mt-5 text-[12.5px] leading-[1.55] text-ink-soft">The sample student also has 3 projects, 84% in Class X and 81% in Class XII.</p>
      </div>

      <div className="min-w-0">
        {/* Screen readers hear the final number, not every step of it gliding there. */}
        <p role="status" className="sr-only">With this profile, {open} of {companies.length} companies are open today.</p>
        <p aria-hidden className="px-1 text-[clamp(1.25rem,1rem+1vw,1.75rem)] font-semibold leading-[1.25] tracking-[-0.025em] text-ink">
          With this profile, <TweenNumber value={open} /> of {companies.length} companies are open today.
        </p>
        <LayoutGroup id="try">
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {GROUPS.map((g) => {
              const list = by(g.key)
              // The picked company stays on the board even when its group is long.
              const top = list.slice(0, SHOWN)
              if (picked && chosen && chosen.bucket === g.key && !top.includes(chosen)) top[SHOWN - 1] = chosen
              return (
                <section key={g.key} data-lq="0.68" aria-label={`${g.name}: ${list.length} companies`} className="lq flex min-h-[200px] flex-col rounded-[28px] p-4 xl:min-h-[348px]">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[15px] font-semibold tracking-[-0.01em]" style={{ color: g.ink }}>{g.name}</h3>
                    <span className="text-[15px] font-semibold text-ink"><TweenNumber value={list.length} /></span>
                  </div>
                  <p className="text-[12.5px] text-ink-soft">{g.says}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5 xl:flex-col">
                    {top.map((c) => (
                      <motion.li key={c.id} layoutId={reduce ? undefined : `try-${c.id}`} layout={reduce ? false : 'position'} transition={motionConfig.spring.gentle}>
                        <button
                          type="button"
                          aria-pressed={chosen?.id === c.id}
                          onClick={() => setPicked(c.id)}
                          className={`flex h-9 w-full items-center gap-2 rounded-full bg-white px-3 text-left text-[13px] font-medium text-ink shadow-card transition-shadow hover:shadow-pop ${chosen?.id === c.id ? 'ring-2' : ''}`}
                          style={{ ['--tw-ring-color' as string]: g.color }}
                        >
                          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: g.color }} />
                          <span className="truncate">{c.name}</span>
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                  {list.length > top.length && <p className="mt-auto pt-2 text-[12.5px] text-ink-soft">and {list.length - top.length} more</p>}
                  {list.length === 0 && <p className="mt-2 text-[12.5px] text-ink-soft">None right now</p>}
                </section>
              )
            })}
          </div>
        </LayoutGroup>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div data-lq="0.78" className="lq rounded-[28px] p-5">{chosen && <Why c={chosen} />}</div>
          <div className="flex flex-col rounded-[28px] bg-ink p-5 text-white">
            <p className="text-[13px] text-white/70">What to fix first</p>
            {fix ? (
              <>
                <p className="mt-0.5 text-[19px] font-semibold leading-[1.3] tracking-[-0.02em]">
                  {fix.label} from {fix.from} to {fix.to}
                </p>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-white/80">
                  Of every single change, this one moves the most companies up: {fix.moves} of {companies.length}.
                </p>
                <button type="button" onClick={() => setP(fix.next)} className="mt-auto inline-flex h-11 items-center justify-center self-start rounded-full bg-[#8ef5d9] px-5 text-[14px] font-semibold text-[#08352a] hover:bg-white">
                  Make that change
                </button>
              </>
            ) : (
              <p className="mt-0.5 text-[16px] font-medium leading-[1.4]">No single step moves a company up from here. Several need to rise together.</p>
            )}
          </div>
        </div>
        <p className="mt-3 px-1 text-[12.5px] leading-[1.55] text-ink-soft">
          This is the engine students use, running in your browser. Requirements shown here are typical for each kind of company, not official cut-offs; real campus drives use the criteria your college posts.
        </p>
      </div>
    </div>
  )
}
