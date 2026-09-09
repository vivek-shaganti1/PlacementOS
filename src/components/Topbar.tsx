import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { companies } from '../data/companies'
import Avatar from './Avatar'
import CompanyLogo from './CompanyLogo'
import { IconBell, IconChevronDown, IconMenu, IconSearch } from './Icons'
import { student } from '../data/student'

export default function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [q, setQ] = useState('')
  const [openMenu, setOpenMenu] = useState(false)
  const [openBell, setOpenBell] = useState(false)
  const navigate = useNavigate()
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) {
        setOpenMenu(false)
        setOpenBell(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const results = q.trim()
    ? companies.filter((c) => (c.name + ' ' + c.role).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6)
    : []

  return (
    <header ref={wrap} className="relative z-30 flex h-[62px] shrink-0 items-center gap-4 border-b border-line bg-white px-5">
      <div className="flex w-[196px] shrink-0 items-center gap-2.5">
        <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-brand text-[17px] font-bold text-white shadow-[0_2px_8px_rgba(109,74,255,.35)]">
          P
        </span>
        <div className="leading-tight">
          <p className="text-[17px] font-bold tracking-[-.02em] text-brand-dark">PlacementIQ</p>
          <p className="text-[10.5px] font-medium text-ink-faint">Enterprise</p>
        </div>
      </div>

      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-[#f3f4f6]"
      >
        <IconMenu className="h-[19px] w-[19px]" />
      </button>

      <div className="relative mx-auto w-full max-w-[512px]">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies, roles, skills..."
          className="h-[38px] w-full rounded-full border border-line bg-[#f7f8fa] pl-10 pr-4 text-[13px] text-ink outline-none transition placeholder:text-ink-faint focus:border-[#d5cbff] focus:bg-white focus:ring-4 focus:ring-brand/10"
        />
        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-[46px] overflow-hidden rounded-xl2 border border-line bg-white py-1.5 shadow-pop">
            {results.map((c) => (
              <button
                key={c.id}
                onMouseDown={() => {
                  setQ('')
                  navigate(`/eligibility?company=${c.id}`)
                }}
                className="flex w-full items-center gap-3 px-3.5 py-2 text-left hover:bg-[#f7f8fa]"
              >
                <CompanyLogo company={c} size={20} />
                <span className="text-[13px] font-medium text-ink">{c.name}</span>
                <span className="text-[12px] text-ink-faint">{c.role}</span>
                <span className="ml-auto text-[12px] font-semibold text-ink-mute">{c.match}%</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => { setOpenBell((v) => !v); setOpenMenu(false) }}
          className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-[#f3f4f6]"
        >
          <IconBell className="h-[19px] w-[19px]" />
          <span className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#f04438] px-1 text-[10px] font-bold text-white ring-2 ring-white">
            5
          </span>
        </button>
        {openBell && (
          <div className="absolute right-0 top-11 w-[320px] overflow-hidden rounded-xl2 border border-line bg-white shadow-pop">
            <p className="border-b border-line px-4 py-2.5 text-[13px] font-semibold">Notifications</p>
            {[
              'Google SDE drive opens in 3 days',
              'Your resume score improved to 82',
              'Microsoft shortlist released',
              'New mock interview slot available',
              '2 alumni replied to your message',
            ].map((n) => (
              <div key={n} className="border-b border-line px-4 py-2.5 text-[12.5px] text-ink-soft last:border-0">
                {n}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => { setOpenMenu((v) => !v); setOpenBell(false) }}
          className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-1.5 hover:bg-[#f3f4f6]"
        >
          <Avatar src={student.avatar} name={student.name} size={34} />
          <div className="text-left leading-tight">
            <p className="text-[13px] font-semibold text-ink">{student.name}</p>
            <p className="text-[11px] text-ink-faint">{student.meta}</p>
          </div>
          <IconChevronDown className="h-4 w-4 text-ink-faint" />
        </button>
        {openMenu && (
          <div className="absolute right-0 top-12 w-48 overflow-hidden rounded-xl2 border border-line bg-white py-1.5 shadow-pop">
            {[
              ['My Profile', '/profile'],
              ['Applications', '/applications'],
              ['Settings', '/settings'],
              ['Help & Support', '/help'],
            ].map(([label, to]) => (
              <button
                key={to}
                onClick={() => { setOpenMenu(false); navigate(to) }}
                className="block w-full px-4 py-2 text-left text-[13px] text-ink-soft hover:bg-[#f7f8fa]"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
