/**
 * A link a user typed (profile, project, certificate, repo), or undefined if it is not an http(s) URL.
 * Anything else, such as "javascript:", would run in the browser of whoever clicks it (often an admin).
 */
export const safeUrl = (u?: string | null): string | undefined => {
  if (!u) return undefined
  try {
    const x = new URL(u)
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : undefined
  } catch {
    return undefined
  }
}
