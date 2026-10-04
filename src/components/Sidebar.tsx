import { AnimatePresence, motion } from 'motion/react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'

type Item = { to: string; label: string }
type Group = { label: string; items: Item[] }

const groups: Group[] = [
  { label: 'Overview', items: [{ to: '/dashboard', label: 'Dashboard' }, { to: '/eligibility', label: 'Eligibility Stacks' }, { to: '/analytics', label: 'Analytics' }] },
  { label: 'Profile', items: [{ to: '/profile', label: 'My Profile' }, { to: '/resume', label: 'Resume Analyzer' }, { to: '/certifications', label: 'Certifications' }] },
  {
    label: 'Prepare',
    items: [{ to: '/skill-gap', label: 'Skill Gap Analyzer' }, { to: '/roadmap', label: 'Learning Roadmap' }, { to: '/practice', label: 'Practice Arena' }, { to: '/mock-interviews', label: 'Mock Interviews' }],
  },
  {
    label: 'Apply',
    items: [{ to: '/jobs', label: 'Campus Jobs' }, { to: '/drives', label: 'Company Insights' }, { to: '/applications', label: 'Applications' }, { to: '/alumni', label: 'Alumni Network' }],
  },
  { label: 'Account', items: [{ to: '/settings', label: 'Settings' }, { to: '/help', label: 'Help & Support' }] },
]

const adminGroup: Group = {
  label: 'Placement cell',
  items: [{ to: '/admin', label: 'Overview' }, { to: '/admin/students', label: 'Students' }, { to: '/admin/jobs', label: 'Job postings' }, { to: '/admin/team', label: 'Admins' }],
}

export default function Sidebar({ open, onChat, mobile, onClose }: { open: boolean; onChat: () => void; mobile?: boolean; onClose?: () => void }) {
  const { isAdmin } = useAuth()
  const visible = isAdmin ? [adminGroup, ...groups] : groups

  const panel = (
    <div className={`flex flex-col border-rule bg-surface ${mobile ? 'h-full w-[min(300px,86vw)] border' : 'h-full w-[232px] border-r'}`}>
      <nav className="scroll-thin flex-1 overflow-y-auto px-3 pb-3 pt-4" aria-label="Main">
        {visible.map((g) => (
          <div key={g.label} className="mb-4">
            <p className="eyebrow px-2.5 pb-1.5">{g.label}</p>
            {g.items.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
                onClick={mobile ? onClose : undefined}
                className={({ isActive }) =>
                  `block rounded-[2px] px-2.5 py-[6px] text-[13.5px] ${isActive ? 'bg-surface-2 font-semibold text-ink' : 'text-ink-soft hover:text-ink hover:underline'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-rule p-3">
        <p className="text-[13px] font-semibold text-ink">Career assistant</p>
        <p className="mt-1 text-[11.5px] leading-[1.5] text-ink-mute">Answers grounded in your profile, resume and coding stats.</p>
        <button
          onClick={() => {
            onChat()
            onClose?.()
          }}
          className="btn-primary mt-2.5 w-full"
        >
          Ask a question
        </button>
      </div>
    </div>
  )

  if (mobile)
    return (
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 flex bg-[#1E1D1A]/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onMouseDown={onClose}>
            <aside className="h-full" onMouseDown={(e) => e.stopPropagation()}>
              {panel}
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    )

  return open ? <aside className="relative z-10 shrink-0">{panel}</aside> : null
}
