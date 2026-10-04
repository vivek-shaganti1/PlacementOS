import { bucketMeta, bucketOrder } from '../data/companies'
import { useCompanies } from '../lib/companies'
import { Card, Page, Stat } from '../components/Page'

const years = [
  { year: '2021', placed: 312, avg: 8.4, highest: 32 },
  { year: '2022', placed: 358, avg: 9.6, highest: 41 },
  { year: '2023', placed: 401, avg: 11.2, highest: 46 },
  { year: '2024', placed: 428, avg: 12.4, highest: 52 },
  { year: '2025', placed: 466, avg: 13.9, highest: 58 },
]

export default function Analytics() {
  const { companies, byBucket } = useCompanies()
  const max = Math.max(...years.map((y) => y.placed))
  const totalCtc = companies.reduce((a, c) => a + c.ctcAvg, 0) / companies.length

  return (
    <Page title="Placement Analytics" subtitle="Your eligibility is computed live from your profile. Campus history below is sample data until your placement cell publishes its numbers." wide>
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Students placed (2025)" value="466" sub="+9% YoY" tone="text-[#0d9a5b]" />
        <Stat label="Average package" value="₹13.9 LPA" sub="Campus-wide" />
        <Stat label="Highest package" value="₹58 LPA" sub="Netflix, 2025" tone="text-brand-dark" />
        <Stat label="Avg. tracked CTC" value={`₹${totalCtc.toFixed(1)} LPA`} sub={`${companies.length} companies`} />
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] gap-4">
        <Card title="Students placed by year (sample campus data)">
          <div className="flex h-[190px] items-end gap-6 px-2">
            {years.map((y) => (
              <div key={y.year} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[11px] font-semibold text-ink-soft">{y.placed}</span>
                <span className="w-full rounded-t-md bg-brand/85 transition-all" style={{ height: `${(y.placed / max) * 140}px` }} />
                <span className="text-[11px] text-ink-mute">{y.year}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Your eligibility distribution">
          <div className="space-y-3">
            {bucketOrder.map((b) => {
              const n = byBucket(b).length
              const pct = Math.round((n / companies.length) * 100)
              const m = bucketMeta[b]
              return (
                <div key={b}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className={`font-medium ${m.text}`}>{m.title}</span>
                    <span className="font-semibold text-ink-mute">{n} ({pct}%)</span>
                  </div>
                  <span className="mt-1.5 block h-[7px] overflow-hidden rounded-full bg-[#eef0f3]">
                    <span className={`block h-full rounded-full ${m.dot}`} style={{ width: `${pct}%` }} />
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Card title="Year-on-year detail">
        <div className="divide-y divide-line">
          <div className="grid grid-cols-4 pb-2 text-[11px] font-semibold text-ink-mute">
            <span>Year</span><span>Students placed</span><span>Average CTC</span><span>Highest CTC</span>
          </div>
          {years.map((y) => (
            <div key={y.year} className="grid grid-cols-4 py-2.5 text-[12.5px] text-ink-soft">
              <span className="font-semibold text-ink">{y.year}</span>
              <span>{y.placed}</span>
              <span>₹{y.avg} LPA</span>
              <span>₹{y.highest} LPA</span>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  )
}
