type P = { className?: string; strokeWidth?: number }

const base = (className = 'w-[18px] h-[18px]', sw = 1.7) => ({
  className,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const IconDashboard = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <path d="M3 10.5 12 3.5l9 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M9.5 20v-5.5h5V20" />
  </svg>
)
export const IconUser = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20c.9-3.6 3.9-5.6 7.5-5.6s6.6 2 7.5 5.6" />
  </svg>
)
export const IconStacks = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <rect x="3.2" y="7" width="17.6" height="13" rx="2.4" />
    <path d="M8.6 7V5.6A2.1 2.1 0 0 1 10.7 3.5h2.6a2.1 2.1 0 0 1 2.1 2.1V7" />
    <path d="m9.6 13.6 1.9 1.9 3.5-3.6" />
  </svg>
)
export const IconDrives = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <path d="M12 2.8 3.5 7v13h17V7Z" />
    <path d="M9 20v-4.4h6V20" />
    <path d="M8 10.5h1.6M14.4 10.5H16" />
  </svg>
)
export const IconTarget = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
)
export const IconRoadmap = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <rect x="4.2" y="10.5" width="15.6" height="9.5" rx="2.2" />
    <path d="M8.2 10.5V7.6a3.8 3.8 0 0 1 7.6 0v2.9" />
  </svg>
)
export const IconPractice = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 3.4v17.2M3.4 12h17.2" />
  </svg>
)
export const IconCheckSquare = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3" />
    <path d="m8.4 12.2 2.5 2.5 4.7-4.9" />
  </svg>
)
export const IconUsers = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <circle cx="9.4" cy="8.4" r="3.2" />
    <path d="M3.4 19.4c.7-3.1 3.1-4.9 6-4.9s5.3 1.8 6 4.9" />
    <path d="M16.2 5.6a3 3 0 0 1 0 5.7M17.2 14.9c2.1.5 3.4 2.2 3.9 4.5" />
  </svg>
)
export const IconFile = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <path d="M14 3.4H7.6A2.2 2.2 0 0 0 5.4 5.6v12.8a2.2 2.2 0 0 0 2.2 2.2h8.8a2.2 2.2 0 0 0 2.2-2.2V7.9Z" />
    <path d="M14 3.4V8h4.6" />
  </svg>
)
export const IconFileText = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <path d="M14 3.4H7.6A2.2 2.2 0 0 0 5.4 5.6v12.8a2.2 2.2 0 0 0 2.2 2.2h8.8a2.2 2.2 0 0 0 2.2-2.2V7.9Z" />
    <path d="M14 3.4V8h4.6M8.6 12.4h6.8M8.6 16h4.8" />
  </svg>
)
export const IconChart = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <path d="M4 20.2h16" />
    <rect x="5.6" y="12" width="3.2" height="6" rx="1" />
    <rect x="10.4" y="8.4" width="3.2" height="9.6" rx="1" />
    <rect x="15.2" y="4.8" width="3.2" height="13.2" rx="1" />
  </svg>
)
export const IconAward = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <circle cx="12" cy="9.2" r="5.4" />
    <path d="m8.6 13.8-1.2 6.6L12 18.2l4.6 2.2-1.2-6.6" />
  </svg>
)
export const IconSettings = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <circle cx="12" cy="12" r="2.9" />
    <path d="M19.2 14.2a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.2a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9h-.2a1.8 1.8 0 1 1 0-3.6h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4v-.2a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9h.2a1.8 1.8 0 1 1 0 3.6h-.1a1.5 1.5 0 0 0-1.4.9Z" />
  </svg>
)
export const IconHelp = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M9.8 9.6a2.3 2.3 0 1 1 3.1 2.2c-.6.3-.9.8-.9 1.5v.4" />
    <circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none" />
  </svg>
)
export const IconSearch = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <circle cx="11" cy="11" r="6.4" />
    <path d="m16 16 4 4" />
  </svg>
)
export const IconBell = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <path d="M18 8.6a6 6 0 1 0-12 0c0 5.2-2 6.6-2 6.6h16s-2-1.4-2-6.6Z" />
    <path d="M13.7 19a2 2 0 0 1-3.4 0" />
  </svg>
)
export const IconMenu = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <path d="M4 7h16M4 12h11M4 17h16" />
  </svg>
)
export const IconChevronDown = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <path d="m6 9.5 6 6 6-6" />
  </svg>
)
export const IconArrowRight = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </svg>
)
export const IconClose = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)
export const IconInfo = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M12 11.2v5" />
    <circle cx="12" cy="8.2" r=".9" fill="currentColor" stroke="none" />
  </svg>
)
export const IconBookmark = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <path d="M6.4 4.6h11.2v15.2L12 16l-5.6 3.8Z" />
  </svg>
)
export const IconMessage = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <path d="M20.4 12.6a7.4 7.4 0 0 1-8 7.4L4 20.8l1-4.6a7.4 7.4 0 1 1 15.4-3.6Z" />
  </svg>
)
export const IconPlusCircle = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 8.4v7.2M8.4 12h7.2" />
  </svg>
)
export const IconLinkedIn = ({ className }: P) => (
  <svg className={className ?? 'w-4 h-4'} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.98 3.5A2.5 2.5 0 1 1 2.5 6 2.5 2.5 0 0 1 4.98 3.5ZM3 8.98h4V21H3ZM9.5 8.98h3.8v1.64h.06A4.17 4.17 0 0 1 17.1 8.7c3.7 0 4.4 2.35 4.4 5.4V21h-4v-5.5c0-1.32-.03-3.02-1.9-3.02s-2.1 1.44-2.1 2.93V21h-4Z" />
  </svg>
)
export const IconLock = IconRoadmap
