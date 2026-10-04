import { motion, type Variants } from 'motion/react'
import type { PointerEvent, ReactNode } from 'react'

export const itemVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
}
/** A quiet fade when content first enters the viewport. No movement. */
export const revealProps = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, amount: 'some', margin: '0px 0px -40px 0px' },
  variants: itemVariants,
} as const

/** Kept for call sites; the cursor spotlight effect has been retired. */
export const trackSpotlight = (_e: PointerEvent<HTMLElement>) => {}

export function Page({ title, subtitle, children, wide, actions }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean; actions?: ReactNode }) {
  return (
    <div className="scroll-thin relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 sm:px-6 sm:py-7">
      <div className={wide ? 'mx-auto max-w-[1180px]' : 'mx-auto max-w-[1000px]'}>
        <div className="flex flex-wrap items-end gap-3 border-b border-rule pb-4 sm:gap-4">
          <div className="flex-1">
            <h1 className="font-display text-[28px] font-medium leading-tight text-ink sm:text-[32px]">{title}</h1>
            {subtitle && <p className="mt-1.5 max-w-[680px] text-[13px] leading-[1.6] text-ink-mute">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <div className="mt-6 space-y-4">{children}</div>
      </div>
    </div>
  )
}

export function Card({ title, action, children, className, icon }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <motion.section {...revealProps} className={`card min-w-0 p-4 sm:p-5 ${className ?? ''}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title && (
            <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
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

/** Renders a figure as-is (no count-up), in the tabular mono face. */
export function AnimatedValue({ value }: { value: string }) {
  return <span className="figure">{value}</span>
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string; icon?: ReactNode }) {
  return (
    <motion.div {...revealProps} className="card px-4 py-4">
      <p className="text-[11.5px] font-medium text-ink-mute">{label}</p>
      <p className={`figure mt-2 text-[26px] font-medium leading-none ${tone ?? 'text-ink'}`}>{value}</p>
      {sub && <p className="mt-2 text-[11px] leading-[1.45] text-ink-faint">{sub}</p>}
    </motion.div>
  )
}

export function Meter({ label, value, tone = '#0F5A45' }: { label: string; value: number; tone?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-ink-soft">{label}</span>
        <span className="figure font-medium text-ink-mute">{value}%</span>
      </div>
      <span className="mt-1.5 block h-[6px] bg-[#E6E1D6]">
        <span className="block h-full" style={{ width: `${v}%`, background: tone }} />
      </span>
    </div>
  )
}

/** Circular progress ring, solid stroke. */
export function Ring({ value, size = 120, stroke = 10, label, sub, color = '#0F5A45' }: { value: number; size?: number; stroke?: number; label?: string; sub?: string; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E6E1D6" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <div className="absolute text-center">
        <p className="figure text-[26px] font-medium leading-none text-ink">{Math.round(value)}</p>
        {label && <p className="mt-1 text-[10.5px] font-medium text-ink-mute">{label}</p>}
        {sub && <p className="text-[10px] text-ink-faint">{sub}</p>}
      </div>
    </div>
  )
}

/** Retired decorative backdrop; renders nothing. */
export function Aurora() {
  return null
}

/* ---------------------------------------------------------------- skeleton loaders */

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={`skeleton block ${className ?? ''}`} />
}

export function CardSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={`card p-5 ${className ?? ''}`} aria-hidden>
      <Skeleton className="h-4 w-40" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }, (_, i) => <Skeleton key={i} className={`h-3 ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />)}
      </div>
    </div>
  )
}

/** Placeholder for a whole page while its code or data loads. */
export function PageSkeleton() {
  return (
    <div className="flex-1 overflow-hidden px-3 py-5 sm:px-6 sm:py-7" role="status" aria-label="Loading">
      <div className="mx-auto max-w-[1000px]">
        <div className="border-b border-rule pb-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-3 h-3 w-96 max-w-full" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card px-4 py-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-16" />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardSkeleton lines={6} />
          <CardSkeleton lines={6} />
        </div>
      </div>
    </div>
  )
}

export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-8 w-8" />
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
