// Fails CI on any High ZAP alert, and on any Medium alert that has not been reviewed and accepted in .zap/accepted.json.
//   node scripts/zap-gate.mjs zap-report/zap.json
import { readFileSync } from 'node:fs'

const report = JSON.parse(readFileSync(process.argv[2] ?? 'zap-report/zap.json', 'utf8'))
const accepted = JSON.parse(readFileSync('.zap/accepted.json', 'utf8'))
const risk = { 3: 'High', 2: 'Medium', 1: 'Low', 0: 'Info' }
// Accepted only where it was reviewed: the same alert on a new path needs a new look.
const reviewed = (id, uri) => (accepted[id]?.paths ?? []).some((p) => new RegExp(`^${p}$`).test(new URL(uri).pathname))
const failures = []
for (const site of report.site ?? []) {
  for (const a of site.alerts ?? []) {
    const level = Number(a.riskcode)
    const fresh = a.instances.filter((i) => !reviewed(a.pluginid, i.uri))
    const where = [...new Set((fresh.length ? fresh : a.instances).map((i) => new URL(i.uri).pathname))].slice(0, 5).join(', ')
    const line = `${risk[level]} ${a.pluginid} ${a.name} (${a.count}) at ${where}`
    if (level >= 3 || (level === 2 && fresh.length)) failures.push(line)
    else console.log(`${fresh.length ? 'noted   ' : 'accepted'} ${line}`)
  }
}
if (failures.length) {
  console.error(`\n${failures.length} alert(s) need attention:\n${failures.join('\n')}`)
  process.exit(1)
}
console.log('\nZAP gate passed: no High alerts and no unreviewed Medium alerts.')
