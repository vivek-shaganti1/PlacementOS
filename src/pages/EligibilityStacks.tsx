import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { byBucket, bucketMeta, bucketOrder, companies } from '../data/companies'
import type { Bucket, Company } from '../data/types'
import CompanyLogo from '../components/CompanyLogo'
import CompanyPanel from '../components/CompanyPanel'
import StackColumn from '../components/StackColumn'
import { IconBot, IconInfo } from '../components/Icons'
import { useApp } from '../lib/store'

const lists = Object.fromEntries(bucketOrder.map((b) => [b, byBucket(b)])) as Record<Bucket, Company[]>
const total = companies.length

export default function EligibilityStacks() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { openAssistant } = useApp()

  const initial = companies.find((c) => c.id === params.get('company')) ?? lists.eligible[0]
  const [selected, setSelected] = useState<Company | null>(initial)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const id = params.get('company')
    if (id) {
      const c = companies.find((x) => x.id === id)
      if (c) setSelected(c)
    }
  }, [params])

  const select = (c: Company) => {
    setSelected(c)
    setParams({ company: c.id }, { replace: true })
  }

  const top = lists.eligible[0]

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="scroll-thin min-w-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-[676px]">
          <div className="flex items-center gap-2">
            <h1 className="text-[21px] font-bold tracking-[-.02em] text-ink">Company Eligibility Stacks</h1>
            <IconInfo className="h-[15px] w-[15px] text-ink-faint" />
          </div>
          <p className="mt-1 text-[12.5px] text-ink-mute">
            AI analyzed your profile and categorized companies based on your eligibility.
          </p>

          <div className="scroll-thin mt-5 flex gap-[10px] overflow-x-auto pb-3">
            {bucketOrder.map((b) => (
              <StackColumn
                key={b}
                list={lists[b]}
                selectedId={selected?.id}
                onSelect={select}
                expanded={!!expanded[b]}
                onToggleExpand={() => setExpanded((e) => ({ ...e, [b]: !e[b] }))}
              />
            ))}
          </div>

          <div className="card mt-3 grid grid-cols-4 gap-2 px-3.5 py-3">
            {bucketOrder.map((b) => {
              const m = bucketMeta[b]
              return (
                <div key={b} className="flex items-start gap-2">
                  <span className={`mt-[3px] h-[13px] w-[13px] shrink-0 rounded-full border-[3px] border-white ring-2 ${m.ring} ${m.dot}`} />
                  <div className="leading-tight">
                    <p className={`text-[11.5px] font-semibold ${m.text}`}>{m.title}</p>
                    <p className="mt-[2px] whitespace-nowrap text-[10px] text-ink-faint">{m.hint}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card mt-4 p-4">
            <p className="text-[14px] font-semibold text-ink">Overall Eligibility Summary</p>
            <div className="mt-3 grid grid-cols-5 gap-3">
              <div className="rounded-[11px] border border-line bg-[#fafbfc] px-3 py-3">
                <p className="text-[11px] font-medium text-ink-mute">Total Companies</p>
                <p className="mt-1 text-[21px] font-bold text-ink">{total}</p>
              </div>
              {bucketOrder.map((b) => {
                const m = bucketMeta[b]
                const n = lists[b].length
                return (
                  <div key={b} className={`rounded-[11px] border px-3 py-3 ${m.head}`}>
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
            <div className="mt-3 grid grid-cols-[1fr_1fr] gap-4">
              <button
                onClick={() => select(top)}
                className="rounded-xl2 border border-line bg-white px-4 py-4 text-left transition hover:border-[#d9dce2] hover:shadow-card"
              >
                <div className="flex items-center gap-3">
                  <CompanyLogo company={top} size={32} />
                  <div className="flex-1">
                    <p className="text-[15px] font-bold text-ink">{top.name}</p>
                    <p className="text-[12px] text-ink-mute">Software Engineer</p>
                  </div>
                  <span className="rounded-md border border-[#c9f0d9] bg-[#ecfdf3] px-2 py-[3px] text-[11px] font-semibold text-[#0d9a5b]">
                    Highly Eligible
                  </span>
                </div>
                <p className="mt-3 text-[11.5px] font-medium text-[#0d9a5b]">Your profile is an excellent match!</p>
              </button>

              <div className="rounded-xl2 border border-[#e6e0ff] bg-[#f6f3ff] px-4 py-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-brand-dark shadow-card">
                    <IconBot className="h-[17px] w-[17px]" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink">AI Suggestion</p>
                    <p className="mt-1 text-[11.5px] leading-[1.6] text-ink-mute">
                      Focus on improving System Design and Advanced DSA to become eligible for Top Product based companies.
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

      {selected && <CompanyPanel company={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
