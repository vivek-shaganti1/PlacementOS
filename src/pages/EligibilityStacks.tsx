import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { bucketMeta, bucketOrder } from '../data/companies'
import { useCompanies } from '../lib/companies'
import { useMediaQuery } from '../lib/useMediaQuery'
import type { Bucket, Company } from '../data/types'
import CompanyLogo from '../components/CompanyLogo'
import CompanyPanel from '../components/CompanyPanel'
import StackColumn from '../components/StackColumn'
import { useApp } from '../lib/store'


export default function EligibilityStacks() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { openAssistant } = useApp()
  const { companies, byBucket, byId } = useCompanies()
  const lists = Object.fromEntries(bucketOrder.map((b) => [b, byBucket(b)])) as Record<Bucket, Company[]>
  const total = companies.length

  // Side-by-side panel needs a wide screen; below that it opens as an overlay only when a company is chosen.
  const isWide = useMediaQuery('(min-width: 1280px)')
  const [selectedId, setSelectedId] = useState<string | null>(params.get('company') ?? (isWide ? companies[0]?.id ?? null : null))
  const selected = byId(selectedId) ?? null
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const id = params.get('company')
    if (id) setSelectedId(id)
  }, [params])

  const select = (c: Company) => {
    setSelectedId(c.id)
    setParams({ company: c.id }, { replace: true })
  }

  // Highest-paying company you already qualify for, else your best match.
  const top = [...lists.eligible].sort((a, b) => b.ctcAvg - a.ctcAvg)[0] ?? companies[0]
  // The skills that block the most "Nearly" / "Can Become" companies.
  const blockers = Object.entries(
    [...lists.nearly, ...lists.canBecome].flatMap((c) => c.gaps.slice(0, 2).map((g) => g.skill)).reduce<Record<string, number>>((a, s) => ({ ...a, [s]: (a[s] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 2)

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="scroll-thin min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-[676px]">
          <div className="flex items-center gap-2">
            <h1 className="text-[21px] font-bold tracking-[-.02em] text-ink">Company Eligibility Stacks</h1>
          </div>
          <p className="mt-1 text-[12.5px] text-ink-mute">
            AI analyzed your profile and categorized companies based on your eligibility.
          </p>

          <div className="scroll-thin mt-5 flex gap-[10px] overflow-x-auto pb-3">
            {bucketOrder.map((b) => (
              <StackColumn
                key={b}
                bucket={b}
                list={lists[b]}
                selectedId={selected?.id}
                onSelect={select}
                expanded={!!expanded[b]}
                onToggleExpand={() => setExpanded((e) => ({ ...e, [b]: !e[b] }))}
              />
            ))}
          </div>

          <div className="card mt-3 grid grid-cols-2 gap-2 px-3.5 py-3 sm:grid-cols-4">
            {bucketOrder.map((b) => {
              const m = bucketMeta[b]
              return (
                <div key={b} className="flex items-start gap-2">
                  <span className={`mt-[3px] h-[13px] w-[13px] shrink-0 rounded-[2px] border-[3px] border-white ring-2 ${m.ring} ${m.dot}`} />
                  <div className="leading-tight">
                    <p className={`text-[11.5px] font-semibold ${m.text}`}>{m.title}</p>
                    <p className="mt-[2px] text-[10px] text-ink-faint sm:whitespace-nowrap">{m.hint}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card mt-4 p-4">
            <p className="text-[14px] font-semibold text-ink">Overall Eligibility Summary</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-[3px] border border-line bg-[#F0EDE5] px-3 py-3">
                <p className="text-[11px] font-medium text-ink-mute">Total Companies</p>
                <p className="mt-1 text-[21px] font-bold text-ink">{total}</p>
              </div>
              {bucketOrder.map((b) => {
                const m = bucketMeta[b]
                const n = lists[b].length
                return (
                  <div key={b} className={`rounded-[3px] border px-3 py-3 ${m.head}`}>
                    <p className={`text-[11px] font-semibold ${m.text}`}>{m.title}</p>
                    <p className="mt-1 text-[21px] font-bold text-ink">
                      {n}
                      <span className="ml-1.5 text-[11.5px] font-semibold text-ink-mute">
                        ({Math.round((n / total) * 100)}%)
                      </span>
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card mt-4 p-4">
            <p className="text-[14px] font-semibold text-brand-dark">Your Top Opportunity</p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                onClick={() => select(top)}
                className="rounded-xl2 border border-line bg-surface px-4 py-4 text-left hover:border-[#DCD6C9]"
              >
                <div className="flex items-center gap-3">
                  <CompanyLogo company={top} size={32} />
                  <div className="flex-1">
                    <p className="text-[15px] font-bold text-ink">{top.name}</p>
                    <p className="text-[12px] text-ink-mute">{top.role} · ₹{top.ctcAvg.toFixed(1)} LPA</p>
                  </div>
                  <span className={`rounded-md border px-2 py-[3px] text-[11px] font-semibold ${bucketMeta[top.bucket].head} ${bucketMeta[top.bucket].text}`}>
                    {bucketMeta[top.bucket].title} · {top.match}%
                  </span>
                </div>
                <p className={`mt-3 text-[11.5px] font-medium ${bucketMeta[top.bucket].text}`}>
                  {top.bucket === 'eligible' ? 'Highest-paying company you qualify for today.' : `Closest match. Biggest gap: ${top.gaps[0]?.skill ?? 'academics'}.`}
                </p>
              </button>

              <div className="rounded-xl2 border border-[#C8C0B0] bg-[#F0EDE5] px-4 py-3.5">
                <div className="flex items-start gap-2.5">
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink">Suggested focus</p>
                    <p className="mt-1 text-[11.5px] leading-[1.6] text-ink-mute">
                      {blockers.length
                        ? `Improving ${blockers.map(([s]) => s).join(' and ')} would move up to ${blockers[0][1]} companies from Nearly or Can Become towards Eligible.`
                        : 'Complete your profile and connect your coding accounts to get a sharper analysis.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/roadmap')}
                  className="mt-3 w-full rounded-[3px] border border-[#C8C0B0] bg-surface py-2 text-[12px] font-semibold text-brand-dark hover:bg-[#F0EDE5]"
                >
                  View My Roadmap
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => openAssistant()}
            className="mt-4 text-[11.5px] font-medium text-brand-dark hover:underline"
          >
            Not sure where to start? Ask the career assistant
          </button>
        </div>
      </div>

      {selected && <CompanyPanel company={selected} overlay={!isWide} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
