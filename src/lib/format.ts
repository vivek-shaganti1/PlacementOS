/** "1 application", "2 applications". Pass `many` for irregular plurals. */
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`

/**
 * Up to two initials (first two words, as before) from a display name or an email. Splits on whitespace and email punctuation, ignores empty
 * words, and takes whole characters (Array.from) so an emoji or accented capital is never cut in half.
 */
export const initials = (name: string) => {
  const base = name.includes('@') ? name.split('@')[0] : name
  const words = base.split(/[\s._+-]+/).filter(Boolean)
  const first = (w: string) => Array.from(w)[0] ?? ''
  const out = words.length > 1 ? first(words[0]) + first(words[1]) : Array.from(words[0] ?? '').slice(0, 2).join('')
  return out.toLocaleUpperCase() || '?'
}
