// Reads the text of a resume on the server, from the stored file. Runs on the edge runtime: no Node APIs.
import { extractText as pdfText, getDocumentProxy } from 'unpdf'

export const fileKind = (b: Uint8Array): 'pdf' | 'docx' | null =>
  String.fromCharCode(...b.subarray(0, 5)) === '%PDF-' ? 'pdf' : b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04 ? 'docx' : null

// A small file can expand enormously; nothing past these sizes is read.
const MAX_XML = 4_000_000
const MAX_PAGES = 12

/** One stored entry of a zip file, inflated. */
async function zipEntry(b: Uint8Array, name: string): Promise<Uint8Array | null> {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  let end = -1
  for (let i = b.length - 22; i >= Math.max(0, b.length - 66_000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      end = i
      break
    }
  }
  if (end < 0) return null
  const count = v.getUint16(end + 10, true)
  let at = v.getUint32(end + 16, true)
  for (let n = 0; n < count && at + 46 <= b.length; n++) {
    if (v.getUint32(at, true) !== 0x02014b50) return null
    const method = v.getUint16(at + 10, true)
    const packed = v.getUint32(at + 20, true)
    const nameLen = v.getUint16(at + 28, true)
    const skip = v.getUint16(at + 30, true) + v.getUint16(at + 32, true)
    const local = v.getUint32(at + 42, true)
    const entry = new TextDecoder().decode(b.subarray(at + 46, at + 46 + nameLen))
    at += 46 + nameLen + skip
    if (entry !== name) continue
    if (local + 30 > b.length) return null
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    const raw = b.slice(start, start + packed)
    if (method === 0) return raw.subarray(0, MAX_XML)
    if (method !== 8) return null
    const reader = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader()
    const parts: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      parts.push(value)
      size += value.length
      if (size > MAX_XML) {
        await reader.cancel()
        throw new Error('document too large')
      }
    }
    const out = new Uint8Array(size)
    let o = 0
    for (const p of parts) {
      out.set(p, o)
      o += p.length
    }
    return out
  }
  return null
}

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

async function docxText(b: Uint8Array): Promise<string> {
  const xml = await zipEntry(b, 'word/document.xml')
  if (!xml) return ''
  return new TextDecoder()
    .decode(xml)
    .replace(/<w:tab\b[^>]*\/>/g, '\t')
    .replace(/<w:(?:br|cr)\b[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => entities[e])
    .replace(/&#(x?)([0-9a-f]+);/gi, (_, x: string, n: string) => {
      const code = parseInt(n, x ? 16 : 10)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
    })
    .replace(/\n{3,}/g, '\n\n')
}

export async function extractText(b: Uint8Array, kind: 'pdf' | 'docx'): Promise<string> {
  if (kind === 'docx') return docxText(b)
  // pdf.js takes ownership of the buffer it is given, so it gets its own copy.
  const pdf = await getDocumentProxy(b.slice())
  try {
    if (pdf.numPages > MAX_PAGES) throw new Error('too many pages')
    const { text } = await pdfText(pdf, { mergePages: false })
    return (text as string[]).join('\n\n')
  } finally {
    await pdf.loadingTask?.destroy()
  }
}
