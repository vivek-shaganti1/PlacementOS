import type { Company } from '../data/types'

type Props = { company: Company; size?: number; className?: string }

const marks: Record<string, (s: number) => JSX.Element> = {
  Google: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l-.1.3 6.5 5 .5.1c4.2-3.9 6.6-9.6 6.6-15.7Z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-.3.1-6.8 5.2-.1.3C7.9 40.9 15.3 46 24 46Z" />
      <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-.3l-6.9-5.4-.2.1A22 22 0 0 0 2 24c0 3.5.9 6.9 2.4 9.9l7.1-5.5Z" />
      <path fill="#EA4335" d="M24 10.5c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.3 29.9 2 24 2 15.3 2 7.9 7.1 4.4 14.1l7.1 5.5C13.3 14.3 18.2 10.5 24 10.5Z" />
    </svg>
  ),
  Microsoft: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48">
      <rect x="4" y="4" width="18.5" height="18.5" fill="#F25022" />
      <rect x="25.5" y="4" width="18.5" height="18.5" fill="#7FBA00" />
      <rect x="4" y="25.5" width="18.5" height="18.5" fill="#00A4EF" />
      <rect x="25.5" y="25.5" width="18.5" height="18.5" fill="#FFB900" />
    </svg>
  ),
  Amazon: (s) => (
    <svg width={s} height={s * 0.72} viewBox="0 0 64 46">
      <text x="2" y="26" fontFamily="IBM Plex Sans, sans-serif" fontSize="21" fontWeight="700" fill="#232F3E">
        amazon
      </text>
      <path d="M6 33c9 6.6 21 9.4 32.5 6.6 3.4-.8 7-2.3 10-4.3.9-.6.2-1.6-.8-1.2-3.4 1.2-7.1 2.2-10.7 2.7C26.8 38.1 16 35.8 7 31.6c-1-.5-1.7.7-1 1.4Z" fill="#FF9900" />
      <path d="M50.6 31.5c-.6-.8-4.1-.4-5.7-.2-.5.1-.5.5 0 .5 1.9-.2 4.9-.6 5.4.1.5.7-.5 3.1-1 4.2-.2.4.2.5.5.2 1.7-1.4 2.2-4.2 1.8-4.8Z" fill="#FF9900" />
    </svg>
  ),
  Adobe: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48">
      <path fill="#FA0F00" d="M18.4 5H3v38ZM29.6 5H45v38ZM24 18.6 33.8 43h-6.4l-2.9-7.4h-7.1Z" />
    </svg>
  ),
  Cisco: (s) => (
    <svg width={s} height={s * 0.62} viewBox="0 0 64 40">
      <g fill="#1BA0D7">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
          const h = [10, 18, 26, 18, 32, 18, 26, 18, 10][i]
          return <rect key={i} x={4 + i * 7} y={34 - h} width="3.4" height={h} rx="1.7" />
        })}
      </g>
    </svg>
  ),
  Deloitte: (s) => (
    <svg width={s} height={s * 0.5} viewBox="0 0 72 36">
      <text x="0" y="26" fontFamily="IBM Plex Sans, sans-serif" fontSize="22" fontWeight="700" fill="#111827">
        Deloitte
      </text>
      <circle cx="68" cy="24" r="4" fill="#86BC25" />
    </svg>
  ),
  Tesla: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48">
      <path fill="#CC0000" d="M24 12.5c-6 0-11.6 1.1-16.2 3l2.2 4.2c3-1.2 6.4-2 9.9-2.3l2.5 4.6V40h3.2V22l2.5-4.6c3.5.3 6.9 1.1 9.9 2.3l2.2-4.2c-4.6-1.9-10.2-3-16.2-3Z" />
      <path fill="#CC0000" d="M24 11.2c4.8 0 9.4.7 13.6 2 1.4-.5 2.7-1.1 3.9-1.8-5.3-2-11.3-3.1-17.5-3.1S11.8 9.4 6.5 11.4c1.2.7 2.5 1.3 3.9 1.8 4.2-1.3 8.8-2 13.6-2Z" />
    </svg>
  ),
  NVIDIA: (s) => (
    <svg width={s} height={s * 0.62} viewBox="0 0 64 40">
      <path
        fill="#76B900"
        d="M22.6 13.4v-3.2c.3 0 .7-.1 1-.1 8.7-.3 14.4 7.5 14.4 7.5s-6.2 8.6-12.8 8.6c-.9 0-1.8-.2-2.6-.4v-9.7c3.4.4 4.1 1.9 6.1 5.3l4.5-3.8s-3.3-4.3-8.9-4.3c-.6 0-1.2 0-1.7.1Zm0-10.6v4.8l1-.1c12.1-.4 20 9.9 20 9.9s-9.1 11-18.5 11c-.9 0-1.7-.1-2.5-.2v3c.7.1 1.4.1 2.1.1 8.8 0 15.1-4.5 21.3-9.8 1 .8 5.2 2.8 6.1 3.7-5.9 4.9-19.5 8.9-27.2 8.9-.7 0-1.5 0-2.2-.1v4.2H55V2.8Zm0 23.1v2.5C14.4 27 12.2 18.6 12.2 18.6s3.9-4.3 10.4-5v2.8h-.1c-3.4-.4-6.1 2.8-6.1 2.8s1.5 5.4 6.2 6.7ZM8.1 18.2s4.8-7.1 14.5-7.9V7.6C11.9 8.5 2.6 17.7 2.6 17.7s5.3 15.2 19.9 16.6v-2.8C11.8 30.1 8.1 18.2 8.1 18.2Z"
      />
    </svg>
  ),
  Visa: (s) => (
    <svg width={s} height={s * 0.4} viewBox="0 0 72 28">
      <text x="0" y="22" fontFamily="IBM Plex Sans, sans-serif" fontSize="24" fontWeight="700" fontStyle="italic" fill="#1A1F71">
        VISA
      </text>
    </svg>
  ),
  Intel: (s) => (
    <svg width={s} height={s * 0.5} viewBox="0 0 64 32">
      <rect x="0.8" y="1.6" width="62.4" height="28.8" rx="14.4" fill="none" stroke="#0071C5" strokeWidth="2.4" />
      <text x="32" y="22" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="16" fontWeight="600" fill="#0071C5">
        intel
      </text>
    </svg>
  ),
  ServiceNow: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48">
      <circle cx="24" cy="22" r="17" fill="none" stroke="#62D84E" strokeWidth="4.5" />
      <path d="M16 38.5c4.8 2.6 10.4 2.6 15.2 0l-3.4-5.4a9.6 9.6 0 0 1-8.4 0Z" fill="#62D84E" />
    </svg>
  ),
  Apple: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="#111111">
      <path d="M33.5 25.6c0-4.6 3.7-6.8 3.9-6.9-2.1-3.1-5.4-3.5-6.6-3.6-2.8-.3-5.5 1.7-6.9 1.7s-3.6-1.6-5.9-1.6c-3 .1-5.8 1.8-7.4 4.5-3.2 5.5-.8 13.6 2.3 18.1 1.5 2.2 3.3 4.6 5.6 4.5 2.3-.1 3.1-1.4 5.8-1.4s3.5 1.4 5.9 1.4c2.4 0 4-2.2 5.5-4.4 1.7-2.5 2.4-4.9 2.5-5-.1-.1-4.7-1.8-4.7-7.3ZM29 11.6c1.2-1.5 2.1-3.6 1.8-5.7-1.8.1-4 1.2-5.3 2.7-1.2 1.3-2.2 3.4-1.9 5.5 2 .1 4.1-1 5.4-2.5Z" />
    </svg>
  ),
  Meta: (s) => (
    <svg width={s} height={s * 0.66} viewBox="0 0 64 42">
      <path
        fill="#0866FF"
        d="M6.6 27.4c0-5 2.4-13.3 7.9-13.3 3 0 5.2 2.7 8.4 8 .8 1.3 1.7 2.9 2.7 4.6 1.2-1.9 2.1-3.5 2.9-4.8 3.6-5.8 5.9-7.8 9-7.8 6.4 0 10 8.4 10 15.4 0 5.6-2.7 9.3-7.4 9.3-3.4 0-6-1.7-9-6.7l-2.6-4.5-2.4 4.2c-3.2 5.6-5.9 7-9.2 7-4.9 0-10.3-3.7-10.3-11.4Zm23.7-4 1.2 2c1 1.7 1.9 3.2 2.7 4.5 2.4 3.8 3.7 4.8 5.5 4.8 2.2 0 3.4-1.9 3.4-5 0-5-2.5-11.4-5.9-11.4-1.7 0-3.4 1.5-5.6 5.1Zm-19.4 4.3c0 3.1 1.5 5 3.8 5 1.9 0 3.3-1 5.7-5l1.7-2.9-1.6-2.7c-2.6-4.4-4.2-5.9-6-5.9-2.4 0-3.6 3.9-3.6 11.5Z"
      />
    </svg>
  ),
  Netflix: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48">
      <path fill="#E50914" d="M14 4h7.6l12.4 36V4H41v40l-7.4.5L21.2 8.6V44.2L14 44Z" />
    </svg>
  ),
  SpaceX: (s) => (
    <svg width={s} height={s * 0.46} viewBox="0 0 64 30">
      <path fill="#111111" d="M2 25 22 5h8L10 25Z" />
      <path fill="#111111" d="M2 5h8l20 20h-8Z" />
      <text x="34" y="20" fontFamily="IBM Plex Sans, sans-serif" fontSize="15" fontWeight="600" fill="#111111">
        X
      </text>
    </svg>
  ),
  OpenAI: (s) => (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" stroke="#111111" strokeWidth="2.6">
      <circle cx="24" cy="24" r="17" />
      <path d="M24 7v34M9 15.5l30 17M39 15.5l-30 17" strokeWidth="1.6" />
    </svg>
  ),
  'Goldman Sachs': (s) => (
    <svg width={s} height={s * 0.5} viewBox="0 0 76 38">
      <text x="0" y="15" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fontWeight="700" fill="#111827">
        Goldman
      </text>
      <text x="0" y="30" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fontWeight="700" fill="#111827">
        Sachs
      </text>
    </svg>
  ),
  'J.P. Morgan': (s) => (
    <svg width={s} height={s * 0.44} viewBox="0 0 64 28">
      <text x="0" y="21" fontFamily="IBM Plex Sans, sans-serif" fontSize="19" fontWeight="700" fill="#5A3E28">
        J.P.
      </text>
    </svg>
  ),
  'Morgan Stanley': (s) => (
    <svg width={s} height={s * 0.5} viewBox="0 0 80 38">
      <text x="0" y="15" fontFamily="IBM Plex Sans, sans-serif" fontSize="12.5" fontWeight="600" fill="#111827">
        Morgan
      </text>
      <text x="0" y="30" fontFamily="IBM Plex Sans, sans-serif" fontSize="12.5" fontWeight="600" fill="#111827">
        Stanley
      </text>
    </svg>
  ),
  Salesforce: (s) => (
    <svg width={s} height={s * 0.72} viewBox="0 0 48 34">
      <path
        fill="#00A1E0"
        d="M19.6 7.4a8.3 8.3 0 0 1 6-2.6c3.1 0 5.8 1.7 7.2 4.3a9.6 9.6 0 0 1 3.9-.8c5.2 0 9.3 4.2 9.3 9.4s-4.1 9.4-9.3 9.4c-.6 0-1.2-.1-1.8-.2a6.8 6.8 0 0 1-8.9 2.8 7.8 7.8 0 0 1-14.4-.5 7.2 7.2 0 0 1-1.5.2A7.4 7.4 0 0 1 2.6 22a7.4 7.4 0 0 1 3.7-6.4A8.5 8.5 0 0 1 19.6 7.4Z"
      />
    </svg>
  ),
}

export default function CompanyLogo({ company, size = 26, className }: Props) {
  const mark = marks[company.name]
  if (mark) return <span className={`inline-flex items-center justify-center ${className ?? ''}`}>{mark(size)}</span>

  const initials = company.name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <span
      className={`inline-flex items-center justify-center rounded-[2px] border border-rule-strong bg-surface-2 font-semibold text-ink-soft ${className ?? ''}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials}
    </span>
  )
}
