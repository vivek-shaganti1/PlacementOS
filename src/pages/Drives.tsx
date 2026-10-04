import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bucketMeta, bucketOrder } from '../data/companies'
import { useCompanies } from '../lib/companies'
import type { Bucket } from '../data/types'
import CompanyLogo from '../components/CompanyLogo'
import { Card, Page } from '../components/Page'

export default function Drives() {
  const navigate = useNavigate()
  const { companies } = useCompanies()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Bucket | 'all'>('all')
  const [sort, setSort] = useState<'match' | 'ctc' | 'name'>('match')

  const rows = useMemo(() => {
    let r = companies.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    if (filter !== 'all') r = r.filter((c) => c.bucket === filter)
    return [...r].sort((a, b) =>
      sort === 'match' ? b.match - a.match : sort === 'ctc' ? b.ctcAvg - a.ctcAvg : a.name.localeCompare(b.name),
    )
  }, [companies, q, filter, sort])

  return (
    <Page title="Company Insights" subtitle={`${rows.length} tracked companies scored against your profile. For drives posted by your college, see Campus Jobs.`} wide>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company"
            className="h-[36px] w-full rounded-[3px] border border-line bg-surface px-3 text-[12.5px] outline-none focus:border-[#C8C0B0] sm:w-[220px]"
          />
          <button onClick={() => setFilter('all')} className={`rounded-[3px] border px-3 py-[7px] text-[12px] font-medium ${filter === 'all' ? 'border-brand bg-brand-tint text-brand-dark' : 'border-line text-ink-soft hover:bg-[#F0EDE5]'}`}>
            All
          </button>
          {bucketOrder.map((b) => (
            <button key={b} onClick={() => setFilter(b)} className={`rounded-[3px] border px-3 py-[7px] text-[12px] font-medium ${filter === b ? 'border-brand bg-brand-tint text-brand-dark' : 'border-line text-ink-soft hover:bg-[#F0EDE5]'}`}>
              {bucketMeta[b].title}
            </button>
          ))}
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-[36px] sm:ml-auto rounded-[3px] border border-line bg-surface px-2.5 text-[12.5px] outline-none">
            <option value="match">Sort: Match</option>
            <option value="ctc">Sort: CTC</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>

        <div className="mt-3 divide-y divide-line">
          {rows.map((c) => {
            const m = bucketMeta[c.bucket]
            return (
              <div key={c.id} className="flex items-center gap-3 py-2.5">
                <CompanyLogo company={c} size={24} />
                <div className="min-w-0 flex-1 md:w-[190px] md:flex-none">
                  <p className="truncate text-[12.5px] font-semibold text-ink">{c.name}</p>
                  <p className="truncate text-[11px] text-ink-mute">
                    {c.role}
                    <span className="md:hidden"> · ₹{c.ctcAvg.toFixed(1)} LPA</span>
                  </p>
                  <p className={`text-[11px] font-semibold md:hidden ${m.text}`}>{m.title}</p>
                </div>
                <span className="hidden w-[110px] text-[12px] text-ink-mute lg:inline">{c.location}</span>
                <span className="hidden w-[110px] text-[12px] text-ink-soft md:inline">₹{c.ctcAvg.toFixed(1)} LPA</span>
                <span className={`hidden w-[150px] text-[11.5px] font-semibold md:inline ${m.text}`}>{m.title}</span>
                <span className="w-[50px] text-right text-[12px] font-semibold text-ink">{c.match}%</span>
                <button onClick={() => navigate(`/eligibility?company=${c.id}`)} className="rounded-md md:ml-auto border border-line px-3 py-1.5 text-[11.5px] font-medium text-ink-soft hover:bg-[#F0EDE5]">
                  View
                </button>
              </div>
            )
          })}
          {rows.length === 0 && <p className="py-6 text-center text-[12.5px] text-ink-faint">No drives match your filters.</p>}
        </div>
      </Card>
    </Page>
  )
}
