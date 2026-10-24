import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { bucketMeta, bucketOrder } from '../data/companies'
import { useCompanies } from '../lib/companies'
import { useMediaQuery } from '../lib/useMediaQuery'
import type { Bucket, Company } from '../data/types'
import CompanyLogo from '../components/CompanyLogo'
import CompanyPanel from '../components/CompanyPanel'
import StackColumn from '../components/StackColumn'
import { IconBot, IconInfo } from '../components/Icons'
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
    // On very wide screens the stacks and the company panel stay together instead of drifting to opposite edges.
    <div className="mx-auto flex min-h-0 w-full max-w-[1480px] flex-1 overflow-hidden">
      <div className="scroll-thin min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-[676px]">
          <p className="label-mono mb-2"><b>01</b> Overview</p>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[30px]">
              Company Eligibility <span className="font-display font-normal italic tracking-[-0.01em] text-gradient">Stacks</span>
            </h1>
            <span title="Each company is scored against its own CGPA, backlog, academic and skill requirements." className="text-ink-faint">
              <IconInfo className="h-[15px] w-[15px]" />
            </span>
          </div>
          <p className="mt-1.5 text-[13px] text-ink-mute">
            Computed from your profile against each recruiter's requirements. Pick a company to see the exact gaps.
          </p>

          <div className="scroll-thin mt-5 flex gap-[10px] overflow-x-auto pb-3">
            {bucketOrder.map((b) => (
              <StackColumn
                key={b}
                bucket={b}
                list={lists[b]}
                total={total}
                selectedId={selected?.id}
                onSelect={select}
                expanded={!!expanded[b]}
                onToggleExpand={() => setExpanded((e) => ({ ...e, [b]: !e[b] }))}
              />
            ))}
          </div>

          <div className="card mt-4 p-4">
            <p className="text-[14px] font-semibold text-ink">Overall eligibility summary</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex flex-col rounded-[12px] border border-line bg-white/80 px-3 py-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-mute">Tracked</p>
                <p className="mt-1.5 text-[24px] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums">{total}</p>
                <span className="mt-auto flex h-[5px] overflow-hidden rounded-full pt-0" style={{ marginTop: 14 }}>
                  {bucketOrder.map((b) => <span key={b} className={bucketMeta[b].dot} style={{ width: `${(lists[b].length / Math.max(1, total)) * 100}%` }} />)}
                </span>
              </div>
              {bucketOrder.map((b) => {
                const m = bucketMeta[b]
                const n = lists[b].length
                return (
                  <div key={b} className={`flex flex-col rounded-[12px] border px-3 py-3 ${m.head}`}>
                    <p className={`font-mono text-[10.5px] uppercase tracking-[0.08em] ${m.text}`}>{({ eligible: 'Eligible', nearly: 'Nearly', canBecome: 'Can become', notEligible: 'Not yet' } as const)[b]}</p>
                    <p className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-[24px] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums">{n}</span>
                      <span className="font-mono text-[11px] text-ink-mute">{Math.round((n / Math.max(1, total)) * 100)}%</span>
                    </p>
                    <span className="mt-auto block h-[5px] overflow-hidden rounded-full bg-white/80" style={{ marginTop: 14 }}>
                      <span className={`block h-full rounded-full ${m.dot}`} style={{ width: `${(n / Math.max(1, total)) * 100}%` }} />
                    </span>
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
                className="rounded-xl2 border border-line bg-white px-4 py-4 text-left transition hover:border-[#d9dce2] hover:shadow-card"
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

              <div className="rounded-xl2 border border-[#e6e0ff] bg-[#f6f3ff] px-4 py-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-brand-dark shadow-card">
                    <IconBot className="h-[17px] w-[17px]" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink">Biggest lever</p>
                    <p className="mt-1 text-[11.5px] leading-[1.6] text-ink-mute">
                      {blockers.length
                        ? `Improving ${blockers.map(([s]) => s).join(' and ')} would move up to ${blockers[0][1]} companies from "Nearly" / "Can Become" towards Eligible.`
                        : 'Complete your profile and connect your coding accounts to get a sharper analysis.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/roadmap')}
                  className="mt-3 w-full rounded-[9px] border border-[#ded4ff] bg-white py-2 text-[12px] font-semibold text-brand-dark hover:bg-[#faf8ff]"
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
            Not sure where to start? Ask the AI Career Assistant →
          </button>
        </div>
      </div>

      {selected && <CompanyPanel company={selected} overlay={!isWide} onClose={() => {
            setSelectedId(null)
            // Drop ?company= too, or a reload reopens the panel that was just closed.
            if (params.has('company')) setParams({}, { replace: true })
          }} />}
    </div>
  )
}
