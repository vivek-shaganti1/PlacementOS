import { AnimatePresence, motion } from 'motion/react'
import { useAuth, type AccountRole } from '../lib/auth'
import { NavLink } from 'react-router-dom'
import {
  IconAward, IconChart, IconCheckSquare, IconDashboard, IconDrives, IconFile, IconFileText,
  IconHelp, IconPractice, IconRoadmap, IconSettings, IconSpark, IconStacks,
  IconTarget, IconUser, IconUsers,
} from './Icons'

const groups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
      { to: '/eligibility', label: 'Eligibility Stacks', Icon: IconStacks },
      { to: '/analytics', label: 'Analytics', Icon: IconChart },
    ],
  },
  {
    label: 'Profile',
    items: [
      { to: '/profile', label: 'My Profile', Icon: IconUser },
      { to: '/resume', label: 'Resume Analyzer', Icon: IconFileText },
      { to: '/certifications', label: 'Certifications', Icon: IconAward },
    ],
  },
  {
    label: 'Prepare',
    items: [
      { to: '/skill-gap', label: 'Skill Gap Analyzer', Icon: IconTarget },
      { to: '/roadmap', label: 'Learning Roadmap', Icon: IconRoadmap },
      { to: '/practice', label: 'Practice Arena', Icon: IconPractice },
      { to: '/mock-interviews', label: 'Mock Interviews', Icon: IconCheckSquare },
    ],
  },
  {
    label: 'Apply',
    items: [
      { to: '/jobs', label: 'Campus Jobs', Icon: IconDrives },
      { to: '/drives', label: 'Company Insights', Icon: IconStacks },
      { to: '/applications', label: 'Applications', Icon: IconFile },
      { to: '/alumni', label: 'Alumni Network', Icon: IconUsers },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/settings', label: 'Settings', Icon: IconSettings },
      { to: '/help', label: 'Help & Support', Icon: IconHelp },
    ],
  },
]

type Group = { label: string; items: { to: string; label: string; Icon: (p: { className?: string }) => JSX.Element }[] }

const placementItems = [
  { to: '/admin', label: 'Overview', Icon: IconDashboard },
  { to: '/admin/students', label: 'Students', Icon: IconUsers },
  { to: '/admin/roster', label: 'Roster', Icon: IconFileText },
  { to: '/admin/jobs', label: 'Job postings', Icon: IconDrives },
  { to: '/admin/team', label: 'Admins', Icon: IconUser },
]

const NAV: Record<AccountRole, Group[]> = {
  super: [
    {
      label: 'Platform',
      items: [
        { to: '/super/orgs', label: 'Organizations', Icon: IconStacks },
        { to: '/super/admins', label: 'Platform admins', Icon: IconSettings },
      ],
    },
    { label: 'All colleges', items: placementItems },
  ],
  org: [{ label: 'Placement cell', items: placementItems }],
  student: groups,
}

export default function Sidebar({ open, onChat, mobile, onClose }: { open: boolean; onChat: () => void; mobile?: boolean; onClose?: () => void }) {
  const { role } = useAuth()
  const visible = NAV[role]

  const panel = (
      <div className={`glass flex flex-col rounded-[22px] ${mobile ? 'h-full w-[min(300px,86vw)]' : 'm-3 mr-0 h-[calc(100%-24px)] w-[228px]'}`}>
        <nav className="scroll-thin flex-1 overflow-y-auto px-2.5 pb-2 pt-3" aria-label="Main">
          {visible.map((g) => (
            <div key={g.label} className="mb-2">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{g.label}</p>
              {g.items.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} end={to === '/admin'} onClick={mobile ? onClose : undefined} className="relative mb-[2px] block rounded-[12px]">
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 rounded-[12px] bg-white shadow-[var(--shadow-1)] ring-1 ring-[oklch(0.88_0.05_285)]"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span
                        className={`relative flex items-center gap-[11px] px-3 py-[8px] text-[13px] transition-colors ${
                          isActive ? 'font-semibold text-brand-dark' : 'font-medium text-ink-soft hover:text-ink'
                        }`}
                      >
                        <Icon className={`h-[17px] w-[17px] ${isActive ? 'text-brand' : 'text-ink-faint'}`} />
                        <span className="truncate">{label}</span>
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {role === 'student' && <div className="p-2.5">
          <div className="gradient-border rounded-[18px]">
            <div className="glass-dark rounded-[18px] p-3.5 text-white">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15">
                  <IconSpark className="h-4 w-4" />
                </span>
                <p className="text-[13px] font-semibold">AI Career Assistant</p>
              </div>
              <p className="mt-2 text-[11.5px] leading-[1.5] text-white/70">Grounded in your profile, resume and coding stats.</p>
              <button
                onClick={() => {
                  onChat()
                  onClose?.()
                }}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[11px] bg-white py-2 text-[12.5px] font-semibold text-[#2c2075] transition hover:bg-white/90 active:scale-[.98]"
              >
                <IconSpark className="h-3.5 w-3.5" />
                Ask anything
              </button>
            </div>
          </div>
        </div>}
      </div>
  )

  if (mobile)
    return (
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 flex bg-[oklch(0.2_0.05_285/0.25)] p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
            <motion.aside
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              onMouseDown={(e) => e.stopPropagation()}
              className="h-full"
            >
              {panel}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    )

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? 240 : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 shrink-0 overflow-hidden"
    >
      {panel}
    </motion.aside>
  )
}
