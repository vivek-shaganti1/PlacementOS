import { AnimatePresence, motion } from 'motion/react'
import { useRef } from 'react'
import { useAuth, type AccountRole } from '../lib/auth'
import { NavLink } from 'react-router-dom'
import {
  IconAward, IconChart, IconCheckSquare, IconDashboard, IconDrives, IconFile, IconFileText,
  IconHelp, IconPractice, IconRoadmap, IconSettings, IconSpark, IconStacks,
  IconTarget, IconUser, IconUsers,
} from './Icons'
import { useDialog } from '../lib/useDialog'

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
      { to: '/what-if', label: 'What-If Simulator', Icon: IconSpark },
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
  { to: '/admin/classes', label: 'Classes', Icon: IconChart },
  { to: '/admin/roster', label: 'Roster', Icon: IconFileText },
  { to: '/admin/jobs', label: 'Job postings', Icon: IconDrives },
  { to: '/admin/team', label: 'Admins & recruiters', Icon: IconUser },
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
  recruiter: [{ label: 'Recruiter', items: [{ to: '/recruiter', label: 'My drives', Icon: IconDrives }] }],
  student: groups,
}

/** The nav group a route belongs to and its number, for the mono label above each page title ("02 · Profile"). */
export function navMeta(role: AccountRole, pathname: string) {
  const list = NAV[role] ?? []
  for (let i = 0; i < list.length; i++) {
    const hit = list[i].items.find((it) => pathname === it.to || (it.to !== '/admin' && pathname.startsWith(`${it.to}/`)))
    if (hit) return { number: String(i + 1).padStart(2, '0'), group: list[i].label }
  }
  return null
}

export default function Sidebar({ open, onChat, mobile, onClose }: { open: boolean; onChat: () => void; mobile?: boolean; onClose?: () => void }) {
  const { role } = useAuth()
  const visible = NAV[role]

  // The phone drawer is a dialog: focus moves in, Tab stays inside, Escape closes it and focus returns to the toggle.
  const drawer = useRef<HTMLElement>(null)
  useDialog(!!mobile && open, () => onClose?.(), drawer)

  const panel = (
      <div className={`glass flex flex-col rounded-[22px] ${mobile ? 'h-full w-[min(300px,86vw)]' : 'm-3 mr-0 h-[calc(100%-24px)] w-[228px]'}`}>
        <nav className="scroll-thin flex-1 overflow-y-auto px-2.5 pb-2 pt-3" aria-label="Main">
          {visible.map((g, gi) => (
            <div key={g.label} className="mb-2">
              <p className="flex items-center gap-2 px-3 pb-1 pt-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                <span className="text-brand/80">{String(gi + 1).padStart(2, '0')}</span>
                {g.label}
              </p>
              {g.items.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} end={to === '/admin'} onClick={mobile ? onClose : undefined} className="relative mb-[2px] block rounded-[12px]">
                  {({ isActive }) => (
                    <>
                      {/* No sliding pill: nav is clicked tens of times a day and a shared-layout animation drops frames
                          while the next page's chunk loads. The active state just appears. */}
                      {isActive && (
                        <span className="absolute inset-0 rounded-[12px] bg-[linear-gradient(180deg,oklch(0.27_0.05_285),oklch(0.18_0.04_285))] shadow-[inset_0_1px_0_oklch(1_0_0/.12),0_6px_16px_oklch(0.2_0.06_285/.22)]" />
                      )}
                      <span
                        className={`relative flex items-center gap-[11px] px-3 py-[8px] text-[13px] transition-colors ${
                          isActive ? 'font-semibold text-white' : 'font-medium text-ink-soft hover:text-ink'
                        }`}
                      >
                        <Icon className={`h-[17px] w-[17px] ${isActive ? 'text-[#8ef5d9]' : 'text-ink-faint'}`} />
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
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[11px] bg-white py-2 text-[12.5px] font-semibold text-[#2c2075] transition-colors hover:bg-white/90 active:bg-white/80"
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
          <motion.div
            className="fixed inset-0 z-40 flex bg-[oklch(0.2_0.05_285/0.25)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.16 } }}
            onMouseDown={onClose}
          >
            {/* Slides in by its own width on the iOS sheet curve; leaves faster than it came. */}
            <motion.aside
              ref={drawer}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              initial={{ transform: 'translateX(-105%)' }}
              animate={{ transform: 'translateX(0%)', transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
              exit={{ transform: 'translateX(-105%)', transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
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
      // Moves between two on-screen states: strong ease-in-out, under 300ms.
      transition={{ duration: 0.24, ease: [0.77, 0, 0.175, 1] }}
      className="relative z-10 shrink-0 overflow-hidden"
      // Collapsed to 0px: its links must not take keyboard focus. (React 18 has no typed `inert`; an empty string sets it.)
      {...({ inert: open ? undefined : '' } as Record<string, string | undefined>)}
    >
      {panel}
    </motion.aside>
  )
}
