/**
 * Academic structure helpers. Year of study is derived from the graduation batch, so it moves up on its own
 * every academic year (which starts in July) without anyone editing records.
 */

export const PROGRAM_YEARS: Record<string, number> = { 'B.Tech': 4, 'B.E.': 4, 'M.Tech': 2, MBA: 2, MCA: 2, 'B.Sc': 3, BCA: 3 }

const academicEndYear = (now = new Date()) => (now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear())

/** 1..N for current students, 0 for graduated, N+1 for not yet started, null when the batch is unknown. */
export function yearOfStudy(batch: string | null | undefined, program = 'B.Tech', now = new Date()): number | null {
  const grad = Number(String(batch ?? '').trim())
  if (!Number.isFinite(grad) || grad < 1990 || grad > 2100) return null
  const total = PROGRAM_YEARS[program] ?? 4
  const y = total - (grad - academicEndYear(now))
  return y < 1 ? 0 : y > total ? total + 1 : y
}

const ORD = ['', '1st', '2nd', '3rd', '4th', '5th']
export function yearLabel(y: number | null, program = 'B.Tech') {
  const total = PROGRAM_YEARS[program] ?? 4
  if (y == null) return 'Batch not set'
  if (y === 0) return 'Graduated'
  if (y > total) return 'Incoming'
  return `${ORD[y] ?? `${y}th`} year`
}

export const sectionLabel = (s: string | null | undefined) => (s && s.trim() ? `Section ${s.trim().toUpperCase()}` : 'No section')
