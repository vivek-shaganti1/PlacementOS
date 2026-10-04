import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompanies } from '../lib/companies'
import Avatar from './Avatar'
import CompanyLogo from './CompanyLogo'
import { Logo } from './Logo'
import { IconBell, IconChevronDown, IconMenu, IconSearch } from './Icons'
import { useAuth, useProfile } from '../lib/auth'
import { useApp } from '../lib/store'

export default function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [q, setQ] = useState('')
  const [openMenu, setOpenMenu] = useState(false)
  const [openBell, setOpenBell] = useState(false)
  const navigate = useNavigate()
  const profile = useProfile()
  const { companies } = useCompanies()
  const { signOut } = useAuth()
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

  return (
    <header ref={wrap} className="glass relative z-30 mx-3 mt-3 flex h-[62px] shrink-0 items-center gap-4 rounded-[20px] px-4">
      <button onClick={() => navigate('/dashboard')} className="w-[206px] shrink-0 text-left" aria-label="PlacementIQ home">
        <Logo size={34} />
      </button>

      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="grid h-9 w-9 place-items-center rounded-[11px] text-ink-soft transition hover:bg-white/80 active:scale-95"
      >
        <IconMenu className="h-[19px] w-[19px]" />
      </button>

      <div className="relative mx-auto w-full max-w-[512px]">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-faint" />
        <input
          ref={search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies, roles…"
          aria-label="Search companies"
          className="h-[40px] w-full rounded-full border border-white/80 bg-white/60 pl-10 pr-14 text-[13px] text-ink outline-none transition placeholder:text-ink-faint focus:bg-white focus:ring-4 focus:ring-brand/10"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-line bg-white/80 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-faint">⌘K</kbd>
        <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong absolute left-0 right-0 top-[48px] overflow-hidden rounded-[16px] py-1.5">
            {results.map((c) => (
              <button
                key={c.id}
                onMouseDown={() => {
                  setQ('')
                  navigate(`/eligibility?company=${c.id}`)
                }}
                className="flex w-full items-center gap-3 px-3.5 py-2 text-left hover:bg-brand-tint"
              >
                <CompanyLogo company={c} size={20} />
                <span className="text-[13px] font-medium text-ink">{c.name}</span>
                <span className="text-[12px] text-ink-faint">{c.role}</span>
                <span className="ml-auto text-[12px] font-semibold text-ink-mute">{c.match}%</span>
              </button>
            ))}
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      <div className="relative">
        <button
          onClick={() => { setOpenBell((v) => !v); setOpenMenu(false) }}
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-[12px] text-ink-soft transition hover:bg-white/80 active:scale-95"
        >
          <IconBell className="h-[19px] w-[19px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#f04438] px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unread}
            </span>
          )}
        </button>
        <AnimatePresence>
        {openBell && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="glass-strong absolute right-0 top-12 w-[340px] overflow-hidden rounded-[18px]">
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
          className="flex items-center gap-2.5 rounded-[14px] py-1 pl-1 pr-2 transition hover:bg-white/80"
        >
          <Avatar src={profile.avatar_url ?? undefined} name={profile.full_name || profile.email} size={34} />
          <div className="text-left leading-tight">
            <p className="text-[13px] font-semibold text-ink">{profile.full_name || profile.email}</p>
            <p className="text-[11px] text-ink-faint">{profile.meta}</p>
          </div>
          <IconChevronDown className="h-4 w-4 text-ink-faint" />
        </button>
        <AnimatePresence>
        {openMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="glass-strong absolute right-0 top-[54px] w-52 overflow-hidden rounded-[18px] py-1.5">
            {[
              ['My Profile', '/profile'],
              ['Applications', '/applications'],
              ['Settings', '/settings'],
              ['Help & Support', '/help'],
            ].map(([label, to]) => (
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
              className="mt-1 block w-full border-t border-line px-4 py-2 text-left text-[13px] text-[#d92d20] hover:bg-[#fef3f2]"
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
