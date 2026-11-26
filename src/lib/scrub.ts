/** Text safe to log or report: no email addresses, phone or roll numbers, tokens, keys or long passages (resume text). */
export const scrub = (v: unknown, max = 200) =>
  String(v ?? '')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]*/g, '[token]')
    .replace(/\b(sb_secret|gsk|ghp|github_pat)_[\w-]+/g, '[key]')
    .replace(/(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g, '[phone]')
    .replace(/\b\d{2}[A-Za-z]{2,4}\d{2,4}[A-Za-z]?\d{1,4}\b/g, '[roll]')
    .slice(0, max)

/** Every string inside a value scrubbed, with a bound on depth and size. */
export function scrubDeep(v: unknown, depth = 0): unknown {
  if (typeof v === 'string') return scrub(v, 300)
  if (v === null || typeof v !== 'object') return v
  if (depth > 8) return '[deep]'
  if (Array.isArray(v)) return v.slice(0, 100).map((x) => scrubDeep(x, depth + 1))
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).slice(0, 100).map(([k, x]) => [k, scrubDeep(x, depth + 1)]))
}

type ErrorEvent = { user?: unknown; request?: { url?: string; [k: string]: unknown }; server_name?: unknown; [k: string]: unknown }
/** What a browser error report may contain: the error and the page path. No person, no query string, no headers or body. */
export function redactEvent<T extends object>(event: T): T {
  const e = scrubDeep(event) as ErrorEvent
  delete e.user
  delete e.server_name
  if (e.request) e.request = { url: String(e.request.url ?? '').split(/[?#]/)[0] }
  return e as T
}
