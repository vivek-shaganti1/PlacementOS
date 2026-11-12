import { AnimatePresence, LayoutGroup, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { companyCatalog } from '../../data/companies'
import { motionConfig } from '../../lib/motion'

/**
 * The hero's right side: the eligibility engine running, as a short loop that tells the product's story.
 * The assistant names one fix, a scan sweeps the board, and that company's card glides to a better column while
 * readiness and the resume score follow. One hero motion for the viewport; everything else (tilt, light, depth) only
 * responds to the pointer. Pauses off-screen and in hidden tabs; reduced motion shows the final board, still.
 */

const ease = motionConfig.easing.dramatic
const COLUMNS = [
  { name: 'Eligible', color: '#12b76a' },
  { name: 'Nearly', color: '#f79009' },
  { name: 'Can become', color: '#2e90fa' },
  { name: 'Stretch', color: '#f04438' },
] as const
type Column = (typeof COLUMNS)[number]['name']

const START: Record<string, Column> = {
  Infosys: 'Eligible', Zoho: 'Eligible', Razorpay: 'Eligible',
  Atlassian: 'Nearly', 'Goldman Sachs': 'Nearly', Uber: 'Nearly',
  Google: 'Can become', Microsoft: 'Can become', Amazon: 'Can become',
  NVIDIA: 'Stretch', Databricks: 'Stretch', 'Jane Street': 'Stretch',
}

// Each step applies one fix on top of the previous ones; the loop then starts again from the beginning.
const STEPS: { tip: string; move?: [string, Column]; readiness: number; verbs: number }[] = [
  { tip: 'Close System Design (62 → 75) and Google moves from Can become to Nearly.', readiness: 82, verbs: 58 },
  { tip: 'System Design is now 75. Google moved to Nearly.', move: ['Google', 'Nearly'], readiness: 85, verbs: 58 },
  { tip: 'Start each bullet with an action verb and Atlassian becomes Eligible.', move: ['Atlassian', 'Eligible'], readiness: 88, verbs: 79 },
  { tip: 'Solve 40 more DP problems and NVIDIA comes within reach.', move: ['NVIDIA', 'Can become'], readiness: 91, verbs: 79 },
]
const STEP_MS = 3400

const brand = (name: string) => companyCatalog.find((c) => c.name === name)?.brand ?? '#6d4aff'

function boardAt(step: number) {
  const board = { ...START }
  for (const s of STEPS.slice(0, step + 1)) if (s.move) board[s.move[0]] = s.move[1]
  return board
}

/** A number that springs to each new value, written straight to the DOM (no re-render per frame). */
function Counter({ value, reduce }: { value: number; reduce: boolean | null }) {
  const ref = useRef<HTMLSpanElement>(null)
  const mv = useSpring(value, { stiffness: 90, damping: 20 })
  useEffect(() => {
    if (reduce) mv.jump(value)
    else mv.set(value)
  }, [value, reduce, mv])
  useMotionValueEvent(mv, 'change', (v) => {
    if (ref.current) ref.current.textContent = String(Math.round(v))
  })
  return <span ref={ref}>{value}</span>
}

export function HeroPreview() {
  const reduce = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const inView = useInView(root, { amount: 0.35 })
  const [step, setStep] = useState(reduce ? STEPS.length - 1 : 0)

  // The loop: only while visible, the tab is shown and motion is allowed.
  useEffect(() => {
    if (reduce || !inView) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') setStep((s) => (s + 1) % STEPS.length)
    }, STEP_MS)
    return () => window.clearInterval(id)
  }, [reduce, inView])

  // Pointer: tilt, a sheen that slides with it, and a spotlight under the cursor (CSS variables, no React state).
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), motionConfig.spring.gentle)
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), motionConfig.spring.gentle)
  const sheenX = useTransform(ry, [-9, 9], ['-35%', '35%'])
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    mx.set(px - 0.5)
    my.set(py - 0.5)
    e.currentTarget.style.setProperty('--sx', `${px * 100}%`)
    e.currentTarget.style.setProperty('--sy', `${py * 100}%`)
  }
  const onLeave = () => {
    mx.set(0)
    my.set(0)
  }

  const s = STEPS[step]
  const board = boardAt(step)
  const moved = s.move?.[0]

  return (
    <div ref={root} className="relative" style={{ perspective: 1400 }}>
      <p className="sr-only">
        A preview of the eligibility board: companies sorted into Eligible, Nearly, Can become and Stretch, a readiness score
        and the AI assistant suggesting the fix that moves each company up.
      </p>
      <motion.div
        aria-hidden
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: motionConfig.duration.slow, delay: 0.25, ease }}
        className="gradient-border group relative rounded-[26px]"
      >
        {/* Rotating conic halo behind the frame: the engine is on. */}
        <div className="hero-halo pointer-events-none absolute -inset-[2px] -z-10 rounded-[28px]" />

        <div className="glass-strong relative overflow-hidden rounded-[26px]">
          {/* Light: a spotlight under the cursor and a sheen that slides with the tilt. */}
          <div className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'radial-gradient(420px circle at var(--sx, 50%) var(--sy, 30%), rgba(255,255,255,.55), transparent 55%)', mixBlendMode: 'soft-light' }} />
          <motion.div className="pointer-events-none absolute -inset-y-10 left-1/4 z-20 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent" style={{ x: sheenX }} />

          <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}
            <span className="ml-3 rounded-full bg-white/70 px-3 py-0.5 text-[10.5px] text-ink-faint">placementiq.app/eligibility</span>
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#12b76a]/10 px-2 py-0.5 text-[10px] font-semibold text-[#067647]">
              <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#12b76a] opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#12b76a]" /></span>
              Live
            </span>
          </div>

          <div className="relative grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_150px]">
            {/* The scan: one sweep each time the board is re-scored. */}
            {!reduce && (
              <motion.span
                key={`scan-${step}`}
                className="pointer-events-none absolute inset-x-3 top-0 z-10 h-16 rounded-full bg-gradient-to-b from-transparent via-[#6d4aff]/15 to-transparent"
                initial={{ y: -64, opacity: 0 }}
                animate={{ y: 300, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.1, ease: motionConfig.easing.smooth }}
              />
            )}

            <LayoutGroup>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {COLUMNS.map((col) => (
                  <div key={col.name} className="min-h-[214px]">
                    <div className="rounded-[12px] px-2 py-2 text-center" style={{ background: `${col.color}14`, border: `1px solid ${col.color}33` }}>
                      <p className="text-[10.5px] font-semibold" style={{ color: col.color }}>
                        {col.name} <span className="font-mono opacity-60">{Object.values(board).filter((c) => c === col.name).length}</span>
                      </p>
                    </div>
                    {Object.keys(START).filter((n) => board[n] === col.name).map((name, i) => (
                      <motion.div
                        key={name}
                        layoutId={`hero-${name}`}
                        layout="position"
                        initial={{ opacity: 0, y: -18, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ layout: { type: 'spring', stiffness: 170, damping: 22 }, delay: step === 0 ? 0.9 + i * 0.08 : 0, ...motionConfig.spring.snappy }}
                        className={`relative mt-2 flex items-center gap-1.5 rounded-[11px] border bg-white/90 px-1.5 py-2 shadow-[var(--shadow-1)] ${name === moved ? 'z-10 border-transparent' : 'border-white/80'}`}
                      >
                        {name === moved && (
                          <motion.span
                            className="pointer-events-none absolute -inset-[2px] rounded-[12px]"
                            style={{ boxShadow: `0 0 0 2px ${col.color}, 0 8px 24px ${col.color}55` }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 1, 0.6] }}
                            transition={{ duration: 1.6, ease }}
                          />
                        )}
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-[9px] font-bold text-white" style={{ background: brand(name) }}>{name[0]}</span>
                        <span className="truncate text-[10.5px] font-semibold text-ink">{name}</span>
                        {name === moved && (
                          <motion.span
                            className="absolute -right-1.5 -top-2 rounded-full px-1.5 py-px text-[8.5px] font-bold text-white"
                            style={{ background: col.color }}
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.35, ...motionConfig.spring.snappy }}
                          >
                            ↑ up
                          </motion.span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>
            </LayoutGroup>

            <div className="hidden space-y-2.5 sm:block">
              <div className="rounded-[16px] border border-white/80 bg-white/80 p-3 text-center">
                <p className="text-[10px] font-medium text-ink-mute">Readiness</p>
                <div className="relative mx-auto mt-1 h-[84px] w-[84px]">
                  <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="oklch(0.92 0.015 285)" strokeWidth="8" />
                    <motion.circle
                      cx="40" cy="40" r="32" fill="none" stroke="url(#hero-ring)" strokeWidth="8" strokeLinecap="round" strokeDasharray={201}
                      initial={{ strokeDashoffset: 201 }}
                      animate={{ strokeDashoffset: 201 * (1 - s.readiness / 100) }}
                      transition={{ delay: step === 0 ? 1.1 : 0.3, duration: step === 0 ? 1.4 : 0.9, ease }}
                    />
                    <defs><linearGradient id="hero-ring"><stop offset="0" stopColor="#6d4aff" /><stop offset="1" stopColor="#38bdf8" /></linearGradient></defs>
                  </svg>
                  <p className="absolute inset-0 grid place-items-center text-[20px] font-semibold text-ink"><Counter value={s.readiness} reduce={reduce} /></p>
                </div>
              </div>
              <div className="rounded-[16px] border border-white/80 bg-white/80 p-3">
                <p className="text-[10px] font-medium text-ink-mute">Resume score</p>
                {([['Metrics', 91], ['Keywords', 84], ['Action verbs', s.verbs]] as const).map(([label, v], i) => {
                  const color = v >= 75 ? '#12b76a' : '#f79009'
                  return (
                    <div key={label} className="mt-2">
                      <div className="flex justify-between text-[9.5px] text-ink-soft"><span>{label}</span><span><Counter value={v} reduce={reduce} />%</span></div>
                      <span className="mt-1 block h-[5px] overflow-hidden rounded-full bg-[oklch(0.92_0.015_285)]">
                        <motion.span
                          className="block h-full origin-left rounded-full"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: v / 100, backgroundColor: color }}
                          transition={{ delay: step === 0 ? 1.3 + i * 0.1 : 0.4, duration: 0.9, ease }}
                        />
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* The assistant floats in front of the board (its own depth layer); its tip changes with each step. */}
        <motion.div
          initial={{ opacity: 0, x: 20, y: 10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: 1.8, duration: motionConfig.duration.normal, ease }}
          style={{ z: 70 }}
          className="glass-dark absolute -bottom-20 -left-12 hidden w-[272px] rounded-[18px] p-3.5 text-white shadow-[0_24px_60px_-20px_rgba(20,17,42,.6)] md:block"
        >
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/50">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8ef5d9] shadow-[0_0_10px_#8ef5d9]" /> AI assistant
          </p>
          <div className="relative mt-1.5 min-h-[54px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={step}
                initial={reduce ? false : { opacity: 0, y: 6, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, ease }}
                className="text-[12px] leading-[1.5] text-white/90"
              >
                {s.tip}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="mt-2 flex gap-1">
            {STEPS.map((_, i) => (
              <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
                {i === step && !reduce && (
                  <motion.span className="block h-full origin-left rounded-full bg-[#8ef5d9]" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: STEP_MS / 1000, ease: 'linear' }} />
                )}
                {(i < step || (reduce && i === step)) && <span className="block h-full rounded-full bg-white/50" />}
              </span>
            ))}
          </div>
        </motion.div>

        {/* A second depth layer on the right: the change the last fix made. */}
        <motion.div
          style={{ z: 45 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2, duration: motionConfig.duration.fast, ease }}
          className="glass absolute -right-5 top-16 hidden rounded-[14px] px-3 py-2 lg:block"
        >
          <p className="text-[9.5px] font-medium uppercase tracking-[0.1em] text-ink-mute">Readiness</p>
          <p className="font-mono text-[13px] font-semibold text-ink">
            82 → <span className="text-[#067647]"><Counter value={s.readiness} reduce={reduce} /></span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
