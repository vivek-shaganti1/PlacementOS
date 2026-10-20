import { animate, motion, useInView, useReducedMotion, type Variants } from 'motion/react'
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { navMeta } from './Sidebar'

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
  viewport: { once: true, amount: 'some', margin: '0px 0px -40px 0px' },
  variants: itemVariants,
} as const

/** Updates --mx/--my so `.spotlight` cards light up under the cursor. */
export const trackSpotlight = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export function Page({ title, accent, subtitle, children, wide, actions }: { title: string; accent?: string; subtitle?: string; children: ReactNode; wide?: boolean; actions?: ReactNode }) {
  const { pathname } = useLocation()
  const { role } = useAuth()
  const meta = navMeta(role, pathname)
  return (
    <div className="scroll-thin relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 sm:px-6 sm:py-7">
      <div className={wide ? 'mx-auto max-w-[1180px]' : 'mx-auto max-w-[1000px]'}>
        <motion.div initial="hidden" animate="show" variants={itemVariants} className="flex flex-wrap items-end gap-3 sm:gap-4">
          <div className="flex-1">
            {meta && (
              <p className="label-mono mb-2">
                <b>{meta.number}</b> {meta.group}
              </p>
            )}
            <h1 className="text-[24px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[30px]">
              {title}
              {accent && <span className="font-display font-normal italic tracking-[-0.01em] text-gradient"> {accent}</span>}
            </h1>
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
    <motion.section {...revealProps} onPointerMove={trackSpotlight} className={`card spotlight min-w-0 p-4 sm:p-5 ${className ?? ''}`}>
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

/** Tiny trend line for stat tiles. Static (no draw-in animation): app numbers never animate on load. */
export function Sparkline({ data, color = '#6d4aff', className }: { data: number[]; color?: string; className?: string }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / span) * 24 - 2}`)
  const id = `spark-${color.replace('#', '')}`
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden className={className ?? 'h-7 w-full'}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,28 ${pts.join(' ')} 100,28`} fill={`url(#${id})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function Stat({
  label, value, sub, tone, icon, trend, delta, trendColor,
}: {
  label: string
  value: string
  sub?: string
  tone?: string
  icon?: ReactNode
  /** Recent values, oldest first, drawn as a sparkline. */
  trend?: number[]
  /** Change since the previous period; shown as a chip. */
  delta?: number | null
  trendColor?: string
}) {
  return (
    <motion.div {...revealProps} onPointerMove={trackSpotlight} className="card card-hover spotlight flex flex-col overflow-hidden px-4 pb-3 pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink-mute">{label}</p>
        {icon && <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-white/80 text-ink-faint ring-1 ring-line">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        {/* App numbers render final immediately: counting up from 0 on load briefly shows wrong values. */}
        <p className={`text-[26px] font-semibold leading-none tracking-[-0.035em] tabular-nums ${tone ?? 'text-ink'}`}>{value}</p>
        {delta !== undefined && delta !== null && delta !== 0 && (
          <span className={`rounded-full px-1.5 py-0.5 font-mono text-[10.5px] font-medium ${delta > 0 ? 'bg-[#ecfdf3] text-[#0d9a5b]' : 'bg-[#fef3f2] text-[#d92d20]'}`}>
            {delta > 0 ? '+' : ''}
            {delta}
          </span>
        )}
      </div>
      {sub && <p className="mt-1.5 text-[11px] leading-[1.45] text-ink-faint">{sub}</p>}
      {trend && trend.length > 1 && <Sparkline data={trend} color={trendColor} className="-mx-1 mt-auto h-7 w-[calc(100%+8px)] pt-2" />}
    </motion.div>
  )
}

/** Empty state with an icon, a short headline and the next step. */
export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      {icon && <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-brand-tint text-brand-dark ring-1 ring-[oklch(0.88_0.06_285)]">{icon}</span>}
      <p className="mt-3 text-[13.5px] font-semibold tracking-[-0.01em] text-ink">{title}</p>
      {body && <p className="mt-1 max-w-[360px] text-[12.5px] leading-[1.55] text-ink-mute">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
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
        {/* Drawn at its value straight away; it sits above the fold, where app screens do not animate on load. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, value)) / 100)}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">
          <span className="tabular-nums">{Math.round(value)}</span>
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

/** Loading placeholder that keeps the layout steady while data arrives. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={`shimmer block rounded-[8px] bg-[oklch(0.92_0.02_285/0.7)] ${className ?? ''}`} />
}

export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  )
}
