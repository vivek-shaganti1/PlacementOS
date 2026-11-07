import { useEffect, useState } from 'react'

/**
 * Long lists (a whole college can be 1,000+ students) render 100 rows at a time. Search, filters and exports still
 * work on the full list; this only limits what is drawn. Resets when the list itself changes.
 */
export function useShowMore<T>(items: T[], step = 100) {
  const [limit, setLimit] = useState(step)
  useEffect(() => setLimit(step), [items.length, step])
  return { visible: items.slice(0, limit), more: Math.max(0, items.length - limit), showMore: () => setLimit((n) => n + step) }
}

export function ShowMoreButton({ more, onClick, step = 100 }: { more: number; onClick: () => void; step?: number }) {
  if (!more) return null
  return (
    <div className="mt-3 flex justify-center">
      <button type="button" onClick={onClick} className="btn-glass text-[12.5px]">
        Show {Math.min(step, more).toLocaleString('en-US')} more ({more.toLocaleString('en-US')} not shown)
      </button>
    </div>
  )
}
