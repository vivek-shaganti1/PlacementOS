// Extracts plain text from a resume file in the browser. Libraries are loaded on demand.

async function fromPdf(buf: ArrayBuffer) {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
  const pages: string[] = []
  for (let i = 1; i <= Math.min(doc.numPages, 6); i++) {
    const content = await (await doc.getPage(i)).getTextContent()
    let line = ''
    const lines: string[] = []
    for (const item of content.items) {
      if (!('str' in item)) continue
      line += item.str
      if (item.hasEOL) {
        lines.push(line)
        line = ''
      }
    }
    if (line) lines.push(line)
    pages.push(lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n'))
  }
  await doc.cleanup()
  return pages.join('\n\n')
}

async function fromDocx(buf: ArrayBuffer) {
  const mammoth = (await import('mammoth')).default
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf })
  return value
}

export async function extractResumeText(file: Blob, name: string): Promise<string> {
  const buf = await file.arrayBuffer()
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf') || file.type === 'application/pdf') return fromPdf(buf)
  if (lower.endsWith('.docx') || file.type.includes('wordprocessingml')) return fromDocx(buf)
  throw new Error('Only PDF and DOCX files can be analyzed. Save older .doc files as PDF or DOCX.')
}
