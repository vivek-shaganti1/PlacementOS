// CSV in and out, shared by the roster paste, the exports and the activity log.

/**
 * Splits pasted spreadsheet text into rows of cells. Handles tabs (copied from Excel or Sheets) and commas, and quoted
 * cells, so a name written as "Rao, Asha" stays one cell and "" inside quotes is a literal quote.
 */
export function parseDelimited(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const s = text.replace(/\r\n?/g, '\n')
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && cell.trim() === '') {
      quoted = true
      cell = ''
    } else if (ch === ',' || ch === '\t') {
      row.push(cell.trim())
      cell = ''
    } else if (ch === '\n') {
      row.push(cell.trim())
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  row.push(cell.trim())
  rows.push(row)
  return rows.filter((r) => r.some((c) => c !== ''))
}

/** One CSV cell: quoted, and never read as a formula by a spreadsheet (phone numbers like "+91 98…" are left alone). */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  if (/^[=+\-@\t\r]/.test(s) && !/^[+\d][\d\s\-()]*$/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export const toCsv = (head: string[], rows: unknown[][]) => [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')

/** Saves text as a file. CSV gets a byte-order mark so Excel reads it as UTF-8 (Indic names, accents, "₹"). */
export function downloadText(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob(type.includes('csv') ? ['\uFEFF', text] : [text], { type: `${type};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
