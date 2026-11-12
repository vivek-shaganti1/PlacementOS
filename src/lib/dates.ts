// "Today" for users in India. Students and placement cells live in IST (UTC+5:30, no daylight saving), so a day
// counted in UTC would roll over at 05:30 in the morning: practice at 23:30 and again at 01:00 would be one day.
const IST_MS = 5.5 * 3_600_000

/** The calendar date in India for a moment (default: now), as YYYY-MM-DD. */
export const istDay = (at: number | string | Date = Date.now()) => new Date(new Date(at).getTime() + IST_MS).toISOString().slice(0, 10)

/** The IST date `n` days before the given IST date. */
export const istDayBefore = (day: string, n = 1) => new Date(Date.parse(`${day}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10)

/** Whole IST days since 1970, for "question of the day" style rotation. */
export const istDayNumber = (at: number = Date.now()) => Math.floor((at + IST_MS) / 86_400_000)
