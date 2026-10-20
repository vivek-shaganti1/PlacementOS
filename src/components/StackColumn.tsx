import type { Bucket, Company } from '../data/types'
import { bucketMeta } from '../data/companies'
import CompanyLogo from './CompanyLogo'

export default function StackColumn({
  bucket,
  list,
  total,
  selectedId,
  onSelect,
  expanded,
  onToggleExpand,
}: {
  bucket: Bucket
  list: Company[]
  total: number
  selectedId?: string
  onSelect: (c: Company) => void
  expanded: boolean
  onToggleExpand: () => void
}) {
  const meta = bucketMeta[bucket]
  const shown = expanded ? list : list.slice(0, 5)
  const rest = list.length - 5
  const share = total ? Math.round((list.length / total) * 100) : 0

  return (
    <div className="flex min-w-[148px] flex-1 flex-col gap-2">
      {/* Header: category, count, share of all tracked companies, and what the category means. */}
      <div className={`relative overflow-hidden rounded-[14px] border px-3 pb-3 pt-3.5 ${meta.head}`}>
        <span className={`absolute inset-x-0 top-0 h-[3px] ${meta.dot}`} />
        <p className={`text-[12.5px] font-semibold ${meta.text}`}>{meta.title}</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[24px] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums">{list.length}</span>
          <span className="font-mono text-[10.5px] text-ink-mute">of {total} · {share}%</span>
        </p>
        <span className="mt-2 block h-[4px] overflow-hidden rounded-full bg-white/80">
          <span className={`block h-full rounded-full ${meta.dot}`} style={{ width: `${share}%` }} />
        </span>
        <p className="mt-2 text-[10.5px] leading-[1.35] text-ink-mute">{meta.hint}</p>
      </div>

      {shown.map((c) => {
        const active = c.id === selectedId
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            aria-pressed={active}
            className={`group rounded-[14px] border bg-white/95 px-2.5 py-2.5 text-left transition duration-200 ${
              active
                ? 'border-transparent shadow-[0_0_0_2px_#6d4aff,0_10px_24px_rgba(109,74,255,.18)]'
                : 'border-line shadow-card hover:-translate-y-0.5 hover:border-[#d9dce2] hover:shadow-pop'
            }`}
          >
            <span className="flex items-center gap-2.5">
              {/* Uniform tile so wordmark logos and initials sit at the same size. */}
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-white ring-1 ring-line">
                <CompanyLogo company={c} size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold leading-tight text-ink">{c.name}</span>
                <span className="mt-0.5 flex items-baseline justify-between gap-1">
                  <span className="truncate text-[10.5px] text-ink-faint">{c.role}</span>
                  <span className={`font-mono text-[11px] font-medium ${meta.text}`}>{c.match}%</span>
                </span>
              </span>
            </span>
            <span className="mt-2 block h-[3px] overflow-hidden rounded-full bg-[oklch(0.93_0.012_285)]">
              <span className={`block h-full rounded-full ${meta.dot}`} style={{ width: `${c.match}%` }} />
            </span>
          </button>
        )
      })}

      {list.length === 0 && (
        <p className="rounded-[14px] border border-dashed border-line px-2.5 py-5 text-center text-[11px] leading-[1.5] text-ink-faint">No companies here right now</p>
      )}

      {rest > 0 && (
        <button
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className="rounded-full border border-line bg-white/70 py-1.5 text-center text-[11.5px] font-semibold text-ink-soft transition hover:bg-white hover:text-ink"
        >
          {expanded ? 'Show less ↑' : `Show ${rest} more ↓`}
        </button>
      )}
    </div>
  )
}
