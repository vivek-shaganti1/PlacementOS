// Loads every API function inside Vercel's edge sandbox (edge-runtime), which lacks many Node features, and reads a real
// PDF and Word file there. Unit tests run on Node and cannot see a feature that is missing on the edge.
import { EdgeRuntime } from 'edge-runtime'
import { build } from 'esbuild'
import { readdirSync } from 'node:fs'
import { deflateRawSync } from 'node:zlib'

const bundle = async (entry) => (await build({ entryPoints: [entry], bundle: true, format: 'iife', globalName: 'M', platform: 'neutral', mainFields: ['module', 'main'], write: false, logLevel: 'error' })).outputFiles[0].text
const failures = []
for (const f of readdirSync('api').filter((x) => x.endsWith('.ts') && !x.startsWith('_'))) {
  try {
    const rt = new EdgeRuntime()
    rt.evaluate('globalThis.process={env:{}}')
    rt.evaluate(await bundle(`api/${f}`))
    // A method no function accepts: proves it loads and runs, and calls nothing outside.
    const status = await rt.evaluate(`M.default(new Request('https://a.test/api/${f.slice(0, -3)}',{method:'PUT'})).then(r=>r.status)`)
    if (status !== 405) failures.push(`${f}: answered ${status}, expected 405`)
  } catch (e) {
    failures.push(`${f}: ${e.message}`)
  }
}

const text = 'Built a service in Python for 900 users'
const stream = `BT /F1 12 Tf 40 700 Td (${text}) Tj ET`
const objs = ['<</Type/Catalog/Pages 2 0 R>>', '<</Type/Pages/Kids[3 0 R]/Count 1>>', '<</Type/Page/Parent 2 0 R/MediaBox[0 0 600 800]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>', `<</Length ${stream.length}>>stream\n${stream}\nendstream`, '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>']
let pdf = '%PDF-1.4\n'
const at = objs.map((o, i) => { const n = pdf.length; pdf += `${i + 1} 0 obj${o}endobj\n`; return n })
const xref = pdf.length
pdf += `xref\n0 6\n0000000000 65535 f \n${at.map((n) => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`
const name = Buffer.from('word/document.xml')
const data = deflateRawSync(`<w:p><w:t>${text}</w:t></w:p>`)
const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(data.length, 18); local.writeUInt16LE(name.length, 26)
const dir = Buffer.alloc(46); dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(8, 10); dir.writeUInt32LE(data.length, 20); dir.writeUInt16LE(name.length, 28)
const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 10); end.writeUInt32LE(30 + name.length + data.length, 16)
const files = { pdf: Buffer.from(pdf, 'latin1'), docx: Buffer.concat([local, name, data, dir, name, end]) }
const rt = new EdgeRuntime()
rt.evaluate(await bundle('api/_resumeText.ts'))
for (const [kind, file] of Object.entries(files)) {
  try {
    const out = await rt.evaluate(`M.extractText(Uint8Array.from(atob('${file.toString('base64')}'),c=>c.charCodeAt(0)),'${kind}')`)
    if (!out.includes(text)) failures.push(`${kind}: text not found`)
  } catch (e) {
    failures.push(`${kind}: ${e.message}`)
  }
}
if (failures.length) {
  console.error(`On the edge runtime:\n${failures.join('\n')}`)
  process.exit(1)
}
console.log('every API function loads on the edge runtime; PDF and Word files are read there')
process.exit(0)
