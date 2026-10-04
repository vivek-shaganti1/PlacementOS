import { animate, motion, useInView, useReducedMotion, type Variants } from 'motion/react'
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'

const ease = [0.16, 1, 0.3, 1] as const

export const listVariants: Variants = { show: { transition: { staggerChildren: 0.06 } } }
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
}
/** Props that make an element reveal itself when it scrolls into view (no parent orchestration needed). */
export const revealProps = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, amount: 0.15 },
  variants: itemVariants,
} as const

/** Updates --mx/--my so `.spotlight` cards light up under the cursor. */
export const trackSpotlight = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export function Page({ title, subtitle, children, wide, actions }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean; actions?: ReactNode }) {
  return (
    <div className="scroll-thin relative flex-1 overflow-y-auto px-6 py-7">
      <div className={wide ? 'mx-auto max-w-[1180px]' : 'mx-auto max-w-[1000px]'}>
        <motion.div initial="hidden" animate="show" variants={itemVariants} className="flex items-end gap-4">
          <div className="flex-1">
            <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink">{title}</h1>
            {subtitle && <p className="mt-1 max-w-[680px] text-[13px] text-ink-mute">{subtitle}</p>}
          </div>
          {actions}
        </motion.div>
        <div className="mt-6 space-y-4">{children}</div>
      </div>
    </div>
  )
}

export function Card({ title, action, children, className, icon }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <motion.section {...revealProps} onPointerMove={trackSpotlight} className={`card spotlight p-5 ${className ?? ''}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <p className="flex items-center gap-2 text-[14px] font-semibold tracking-[-0.01em] text-ink">
              {icon}
              {title}
            </p>
          )}
          {action}
        </div>
      )}
      {children}
    </motion.section>
  )
}

/** Counts up to a number when it scrolls into view. Non-numeric values render as-is. */
export function AnimatedValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const m = value.match(/^([^\d-]*)(-?\d+(?:\.\d+)?)(.*)$/)
  const target = m ? parseFloat(m[2]) : NaN
  const decimals = m?.[2].includes('.') ? m[2].split('.')[1].length : 0
  const [shown, setShown] = useState(reduce || !m ? target : 0)

  useEffect(() => {
    if (!m || !inView || reduce) {
      setShown(target)
      return
    }
    const controls = animate(0, target, { duration: 1.1, ease, onUpdate: setShown })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, inView, reduce])

  if (!m) return <span ref={ref}>{value}</span>
  return (
    <span ref={ref} className="tabular-nums">
      {m[1]}
      {shown.toFixed(decimals)}
      {m[3]}
    </span>
  )
}

export function Stat({ label, value, sub, tone, icon }: { label: string; value: string; sub?: string; tone?: string; icon?: ReactNode }) {
  return (
    <motion.div {...revealProps} onPointerMove={trackSpotlight} className="card card-hover spotlight px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] font-medium text-ink-mute">{label}</p>
        {icon && <span className="text-ink-faint">{icon}</span>}
      </div>
      <p className={`mt-2 text-[24px] font-semibold leading-none tracking-[-0.03em] ${tone ?? 'text-ink'}`}>
        <AnimatedValue value={value} />
      </p>
      {sub && <p className="mt-2 text-[11px] text-ink-faint">{sub}</p>}
    </motion.div>
  )
}

export function Meter({ label, value, tone = '#6d4aff' }: { label: string; value: number; tone?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const v = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-ink-soft">{label}</span>
        <span className="font-semibold tabular-nums text-ink-mute">{value}%</span>
      </div>
      <span ref={ref} className="mt-1.5 block h-[7px] overflow-hidden rounded-full bg-[oklch(0.92_0.015_285)]">
        <motion.span
          className="block h-full w-full origin-left rounded-full"
          style={{ background: `linear-gradient(90deg, ${tone}cc, ${tone})` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: inView ? v / 100 : 0 }}
          transition={{ duration: 0.9, ease }}
        />
      </span>
    </div>
  )
}

/** Circular progress ring with an animated sweep. */
export function Ring({ value, size = 120, stroke = 10, label, sub, color = '#6d4aff' }: { value: number; size?: number; stroke?: number; label?: string; sub?: string; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const id = `ring${size}${Math.round(value)}`
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color} />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(0.92 0.015 285)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(100, value)) / 100) }}
          transition={{ duration: 1.2, ease }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">
          <AnimatedValue value={`${Math.round(value)}`} />
        </p>
        {label && <p className="mt-1 text-[10.5px] font-medium text-ink-mute">{label}</p>}
        {sub && <p className="text-[10px] text-ink-faint">{sub}</p>}
      </div>
    </div>
  )
}

export function Aurora() {
  return (
    <>
      <div className="aurora" aria-hidden>
        <div className="aurora__blob aurora__blob--a" />
        <div className="aurora__blob aurora__blob--b" />
        <div className="aurora__blob aurora__blob--c" />
      </div>
      <div className="grain" aria-hidden />
    </>
  )
}
