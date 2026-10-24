import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompanies } from '../lib/companies'
import Avatar from './Avatar'
import CompanyLogo from './CompanyLogo'
import { Logo, LogoMark } from './Logo'
import { IconBell, IconChevronDown, IconMenu, IconSearch } from './Icons'
import { HOME, useAuth, useProfile } from '../lib/auth'
import { useApp } from '../lib/store'

export default function Topbar({ onToggleSidebar, sidebarOpen }: { onToggleSidebar: () => void; sidebarOpen?: boolean }) {
  const [q, setQ] = useState('')
  const [openMenu, setOpenMenu] = useState(false)
  const [openBell, setOpenBell] = useState(false)
  const navigate = useNavigate()
  const profile = useProfile()
  const { companies } = useCompanies()
  const { signOut, role } = useAuth()
  const isStudent = role === 'student'
  const { notifications, markRead } = useApp()
  const unread = notifications.filter((n) => !n.read).length
  const wrap = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        search.current?.focus()
      }
      if (e.key === 'Escape') {
        setQ('')
        setOpenBell(false)
        setOpenMenu(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
  const [active, setActive] = useState(0)
  useEffect(() => setActive(0), [q])
  const pick = (id: string) => {
    setQ('')
    search.current?.blur()
    navigate(`/eligibility?company=${id}`)
  }

  return (
    <header ref={wrap} className="glass relative z-30 mx-2 mt-2 flex h-[58px] shrink-0 items-center gap-2 rounded-[18px] px-2.5 sm:mx-3 sm:mt-3 sm:h-[62px] sm:gap-4 sm:rounded-[20px] sm:px-4">
      <button onClick={() => navigate(HOME[role])} className="shrink-0 text-left lg:w-[206px]" aria-label="PlacementIQ home">
        <span className="sm:hidden"><LogoMark size={34} /></span>
        <span className="hidden sm:block"><Logo size={34} /></span>
      </button>

      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        aria-expanded={sidebarOpen}
        className="grid h-9 w-9 place-items-center rounded-[11px] text-ink-soft transition-colors hover:bg-white/80"
      >
        <IconMenu className="h-[19px] w-[19px]" />
      </button>

      <div className="flex-1 md:hidden" />
      {!isStudent && <div className="hidden flex-1 md:block" />}
      <div className={`relative mx-auto hidden w-full max-w-[512px] ${isStudent ? 'md:block' : ''}`}>
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-faint" />
        <input
          ref={search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (!results.length) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((i) => (i + 1) % results.length)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => (i - 1 + results.length) % results.length)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              pick(results[Math.min(active, results.length - 1)].id)
            }
          }}
          placeholder="Search companies, roles…"
          aria-label="Search companies"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="search-results"
          aria-autocomplete="list"
          aria-activedescendant={results.length ? `search-opt-${results[Math.min(active, results.length - 1)].id}` : undefined}
          className="h-[40px] w-full rounded-full border border-white/80 bg-white/60 pl-10 pr-14 text-[13px] text-ink outline-none transition placeholder:text-ink-faint focus:bg-white focus:ring-4 focus:ring-brand/10"
        />
        <kbd className="kbd kbd-light pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 px-1.5">⌘K</kbd>
        {/* Typing drives this list, so it appears and updates instantly: keyboard-initiated UI never animates. */}
        {results.length > 0 && (
          <div id="search-results" role="listbox" aria-label="Companies" className="glass-strong absolute left-0 right-0 top-[48px] overflow-hidden rounded-[16px] py-1.5">
            {results.map((c, i) => (
              <button
                key={c.id}
                id={`search-opt-${c.id}`}
                role="option"
                aria-selected={i === active}
                tabIndex={-1}
                // mousedown would blur the input first; prevent that, then act on click (which keyboards fire too).
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(c.id)}
                className={`flex w-full items-center gap-3 px-3.5 py-2 text-left ${i === active ? 'bg-brand-tint' : ''}`}
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

      <div className={`relative ${isStudent ? '' : 'hidden'}`}>
        <button
          onClick={() => { setOpenBell((v) => !v); setOpenMenu(false) }}
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          aria-haspopup="true"
          aria-expanded={openBell}
          className="relative grid h-10 w-10 place-items-center rounded-[12px] text-ink-soft transition-colors hover:bg-white/80"
        >
          <IconBell className="h-[19px] w-[19px]" />
          {unread > 0 && (
            <span aria-hidden className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#f04438] px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
        <AnimatePresence>
        {openBell && (
          <motion.div
            // Scales from its trigger (top right). Opens in 180ms, closes faster; transform strings stay on the GPU.
            initial={{ opacity: 0, transform: 'translateY(-4px) scale(0.97)' }}
            animate={{ opacity: 1, transform: 'translateY(0px) scale(1)', transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } }}
            exit={{ opacity: 0, transform: 'translateY(-2px) scale(0.98)', transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] } }}
            style={{ transformOrigin: 'top right' }}
            className="glass-strong absolute right-0 top-12 w-[340px] overflow-hidden rounded-[18px] max-sm:fixed max-sm:inset-x-3 max-sm:top-[68px] max-sm:w-auto">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <p className="text-[13px] font-semibold">Notifications</p>
              {unread > 0 && (
                <button onClick={() => markRead()} className="text-[11.5px] font-medium text-brand-dark hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="scroll-thin max-h-[360px] overflow-y-auto">
              {notifications.length === 0 && <p className="px-4 py-5 text-center text-[12.5px] text-ink-faint">You're all caught up.</p>}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markRead(n.id)
                    setOpenBell(false)
                    if (n.link) navigate(n.link)
                  }}
                  className={`flex w-full items-start gap-2 border-b border-line px-4 py-2.5 text-left text-[12.5px] last:border-0 hover:bg-brand-tint ${n.read ? 'text-ink-faint' : 'text-ink-soft'}`}
                >
                  <span className={`mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand'}`} />
                  {n.text}
                </button>
              ))}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      <div className="relative">
        <button
          onClick={() => { setOpenMenu((v) => !v); setOpenBell(false) }}
          aria-label="Account menu"
          aria-haspopup="true"
          aria-expanded={openMenu}
          className="flex min-w-0 items-center gap-2.5 rounded-[14px] py-1 pl-1 pr-2 transition-colors hover:bg-white/80"
        >
          <Avatar src={profile.avatar_url ?? undefined} name={profile.full_name || profile.email} size={34} />
          <div className="hidden max-w-[150px] text-left leading-tight sm:block xl:max-w-[220px]">
            <p className="truncate text-[13px] font-semibold text-ink">{profile.full_name || profile.email}</p>
            <p className="truncate text-[11px] text-ink-faint">{role === 'super' ? 'Platform admin' : role === 'org' ? 'Placement cell' : role === 'recruiter' ? 'Recruiter' : profile.meta}</p>
          </div>
          <IconChevronDown className="hidden h-4 w-4 text-ink-faint sm:block" />
        </button>
        <AnimatePresence>
        {openMenu && (
          <motion.div
            // Scales from its trigger (top right). Opens in 180ms, closes faster; transform strings stay on the GPU.
            initial={{ opacity: 0, transform: 'translateY(-4px) scale(0.97)' }}
            animate={{ opacity: 1, transform: 'translateY(0px) scale(1)', transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } }}
            exit={{ opacity: 0, transform: 'translateY(-2px) scale(0.98)', transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] } }}
            style={{ transformOrigin: 'top right' }}
            className="glass-strong absolute right-0 top-[54px] w-52 overflow-hidden rounded-[18px] py-1.5">
            {(isStudent ? [
              ['My Profile', '/profile'],
              ['Applications', '/applications'],
              ['Settings', '/settings'],
              ['Help & Support', '/help'],
            ] : []).map(([label, to]) => (
              <button
                key={to}
                onClick={() => { setOpenMenu(false); navigate(to) }}
                className="block w-full px-4 py-2 text-left text-[13px] text-ink-soft hover:bg-brand-tint"
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => { setOpenMenu(false); signOut() }}
              className={`block w-full px-4 ${isStudent ? 'mt-1 border-t border-line' : ''} py-2 text-left text-[13px] text-[#d92d20] hover:bg-[#fef3f2]`}
            >
              Sign out
            </button>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </header>
  )
}
