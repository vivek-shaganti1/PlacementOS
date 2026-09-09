import { NavLink } from 'react-router-dom'
import {
  IconAward, IconChart, IconCheckSquare, IconDashboard, IconDrives, IconFile, IconFileText,
  IconHelp, IconPlusCircle, IconPractice, IconRoadmap, IconSettings, IconSpark, IconStacks,
  IconTarget, IconUser, IconUsers,
} from './Icons'

const nav = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/profile', label: 'My Profile', Icon: IconUser },
  { to: '/eligibility', label: 'Eligibility Stacks', Icon: IconStacks },
  { to: '/drives', label: 'Company Drives', Icon: IconDrives },
  { to: '/skill-gap', label: 'Skill Gap Analyzer', Icon: IconTarget },
  { to: '/roadmap', label: 'Learning Roadmap', Icon: IconRoadmap },
  { to: '/practice', label: 'Practice Arena', Icon: IconPractice },
  { to: '/mock-interviews', label: 'Mock Interviews', Icon: IconCheckSquare },
  { to: '/alumni', label: 'Alumni Network', Icon: IconUsers },
  { to: '/applications', label: 'Applications', Icon: IconFile },
  { to: '/analytics', label: 'Placement Analytics', Icon: IconChart },
  { to: '/resume', label: 'Resume Analyzer', Icon: IconFileText },
  { to: '/certifications', label: 'Certifications', Icon: IconAward },
  { to: '/settings', label: 'Settings', Icon: IconSettings },
  { to: '/help', label: 'Help & Support', Icon: IconHelp },
]

export default function Sidebar({ open, onChat }: { open: boolean; onChat: () => void }) {
  return (
    <aside
      className={`${open ? 'w-[224px]' : 'w-0'} shrink-0 overflow-hidden border-r border-line bg-white transition-[width] duration-200`}
    >
      <div className="flex h-full w-[224px] flex-col">
        <nav className="scroll-thin flex-1 overflow-y-auto px-3 pt-3 pb-2">
          {nav.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group mb-[2px] flex items-center gap-[11px] rounded-[9px] px-3 py-[9px] text-[13.5px] transition-colors ${
                  isActive
                    ? 'bg-brand-tint font-semibold text-brand-dark'
                    : 'font-medium text-ink-soft hover:bg-[#f5f6f8]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-brand-dark' : 'text-ink-faint'}`} />
                  <span className="truncate">{label}</span>
                  {isActive && <span className="ml-auto h-5 w-[3px] rounded-full bg-brand" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3">
          <div className="rounded-xl2 border border-[#e6e0ff] bg-gradient-to-b from-[#f7f4ff] to-[#f2eeff] p-3.5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-white">
                <IconSpark className="h-4 w-4" />
              </span>
              <p className="text-[13px] font-semibold text-brand-dark">AI Career Assistant</p>
            </div>
            <p className="mt-2 text-[11.5px] leading-[1.5] text-ink-mute">
              Ask me anything about your career, skills or placements.
            </p>
            <button
              onClick={onChat}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-[#ded4ff] bg-white py-2 text-[12.5px] font-semibold text-brand-dark shadow-card transition hover:bg-[#faf8ff]"
            >
              <IconPlusCircle className="h-4 w-4" />
              Chat Now
              <IconSpark className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
