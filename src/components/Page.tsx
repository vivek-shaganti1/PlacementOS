import type { ReactNode } from 'react'

export function Page({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="scroll-thin flex-1 overflow-y-auto px-6 py-6">
      <div className={wide ? 'mx-auto max-w-[1180px]' : 'mx-auto max-w-[980px]'}>
        <h1 className="text-[21px] font-bold tracking-[-.02em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[12.5px] text-ink-mute">{subtitle}</p>}
        <div className="mt-5 space-y-4">{children}</div>
      </div>
    </div>
  )
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-4 ${className ?? ''}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <p className="text-[14px] font-semibold text-ink">{title}</p>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="card px-4 py-3.5">
      <p className="text-[11.5px] font-medium text-ink-mute">{label}</p>
      <p className={`mt-1.5 text-[22px] font-bold leading-none ${tone ?? 'text-ink'}`}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-ink-faint">{sub}</p>}
    </div>
  )
}

export function Meter({ label, value, tone = '#6d4aff' }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-ink-soft">{label}</span>
        <span className="font-semibold text-ink-mute">{value}%</span>
      </div>
      <span className="mt-1.5 block h-[7px] overflow-hidden rounded-full bg-[#eef0f3]">
        <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${value}%`, background: tone }} />
      </span>
    </div>
  )
}
