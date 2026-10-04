import { useMemo, useState } from 'react'
import { companyCatalog as companies } from '../data/companies'
import Avatar from '../components/Avatar'
import { IconLinkedIn, IconMessage } from '../components/Icons'
import { Card, Page } from '../components/Page'
import { useApp } from '../lib/store'
import { linkedInSearch } from '../lib/links'

const all = companies.flatMap((c) => c.alumni.map((a) => ({ ...a, company: c.name, brand: c.brand })))

export default function AlumniNetwork() {
  const [q, setQ] = useState('')
  const { openAssistant } = useApp()
  const rows = useMemo(
    () => all.filter((a) => (a.name + a.company + a.location).toLowerCase().includes(q.toLowerCase())).slice(0, 60),
    [q],
  )

  return (
    <Page title="Alumni Network" subtitle={`${all.length} alumni from your college across tracked companies.`} wide>
      <Card>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, company or city"
          className="h-[36px] w-full max-w-[320px] rounded-[9px] border border-line bg-white px-3 text-[12.5px] outline-none focus:border-[#d5cbff]"
        />
        <div className="mt-3 grid grid-cols-1 gap-x-6 divide-y divide-line lg:grid-cols-2">
          {rows.map((a, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Avatar src={a.avatar} name={a.name} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-ink">{a.name}</p>
                <p className="truncate text-[11px] text-ink-mute">{a.title}</p>
              </div>
              <span className="hidden w-[80px] text-[11.5px] text-ink-mute sm:inline">{a.location}</span>
              <a href={linkedInSearch(a.name, a.company)} target="_blank" rel="noreferrer" className="grid h-7 w-7 place-items-center rounded-md border border-line text-[#0A66C2] hover:bg-[#f7f8fa]">
                <IconLinkedIn className="h-[15px] w-[15px]" />
              </a>
              <button onClick={() => openAssistant(`Draft a short intro message to ${a.name}, ${a.title}.`)} className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-ink-soft hover:bg-[#f7f8fa]">
                <IconMessage className="h-[14px] w-[14px]" />
                <span className="hidden sm:inline">Message</span>
              </button>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  )
}
