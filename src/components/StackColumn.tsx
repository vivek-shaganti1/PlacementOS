import type { Company } from '../data/types'
import { bucketMeta } from '../data/companies'
import CompanyLogo from './CompanyLogo'

export default function StackColumn({
  list,
  selectedId,
  onSelect,
  expanded,
  onToggleExpand,
}: {
  list: Company[]
  selectedId?: string
  onSelect: (c: Company) => void
  expanded: boolean
  onToggleExpand: () => void
}) {
  const meta = bucketMeta[list[0].bucket]
  const shown = expanded ? list : list.slice(0, 5)
  const rest = list.length - 5

  return (
    <div className="flex w-[160px] shrink-0 flex-col gap-2">
      <div className={`rounded-xl2 border px-3 py-3 text-center ${meta.head}`}>
        <p className={`text-[13.5px] font-semibold ${meta.text}`}>{meta.title}</p>
        <p className="mt-0.5 text-[11.5px] font-medium text-ink-mute">{list.length} Companies</p>
      </div>

      {shown.map((c) => {
        const active = c.id === selectedId
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`flex items-center gap-2.5 rounded-xl2 border bg-white px-2.5 py-2.5 text-left transition ${
              active
                ? 'border-brand ring-1 ring-brand shadow-card'
                : 'border-line shadow-card hover:border-[#d9dce2] hover:shadow-pop'
            }`}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center">
              <CompanyLogo company={c} size={22} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold leading-tight text-ink">{c.name}</span>
              <span className={`block text-[11px] font-medium ${meta.text}`}>{c.match}% Match</span>
            </span>
          </button>
        )
      })}

      {rest > 0 && (
        <button
          onClick={onToggleExpand}
          className={`py-1 text-center text-[11.5px] font-medium hover:underline ${meta.more}`}
        >
          {expanded ? 'Show less' : `+ ${rest} more companies`}
        </button>
      )}
    </div>
  )
}
