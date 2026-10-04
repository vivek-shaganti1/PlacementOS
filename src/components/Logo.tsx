import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'

/**
 * PlacementIQ mark: a deep-indigo gem squircle with a glass sheen, a "P" built from a solid
 * pillar and a single continuous bowl stroke, and a mint "insight" spark marking the upward
 * trajectory. `animate` draws it in (used by the launch intro).
 */
export function LogoMark({ size = 36, animate = false, className }: { size?: number; animate?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '')
  const reduce = useReducedMotion()
  const play = animate && !reduce
  const ease = [0.16, 1, 0.3, 1] as const

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="PlacementIQ"
      className={className}
      initial={play ? { scale: 0.6, opacity: 0, rotate: -8 } : false}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ duration: 0.7, ease }}
    >
      <defs>
        <linearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2c2075" />
          <stop offset="1" stopColor="#0f0b2e" />
        </linearGradient>
        <radialGradient id={`glow${id}`} cx="0.22" cy="0.18" r="0.75">
          <stop offset="0" stopColor="#8a6bff" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#5b3df5" stopOpacity="0.25" />
          <stop offset="1" stopColor="#5b3df5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`glyph${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9d0ff" />
        </linearGradient>
        <linearGradient id={`spark${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8ef5d9" />
          <stop offset="1" stopColor="#5fb4ff" />
        </linearGradient>
        <linearGradient id={`sheen${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`clip${id}`}>
          <rect width="64" height="64" rx="18" />
        </clipPath>
      </defs>

      <g clipPath={`url(#clip${id})`}>
        <rect width="64" height="64" fill={`url(#bg${id})`} />
        <rect width="64" height="64" fill={`url(#glow${id})`} />
        <path d="M0 0H64V24C44 30 22 30 0 22Z" fill={`url(#sheen${id})`} />
      </g>
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="17.25" fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="1.5" />

      {/* stem */}
      <motion.rect
        x="17.5"
        y="15"
        width="8.5"
        height="34"
        rx="4.25"
        fill={`url(#glyph${id})`}
        style={{ transformOrigin: '21.75px 49px' }}
        initial={play ? { scaleY: 0 } : false}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.55, delay: 0.25, ease }}
      />
      {/* bowl */}
      <motion.path
        d="M21.75 19.25H33a8.75 8.75 0 0 1 0 17.5h-6.5"
        fill="none"
        stroke={`url(#glyph${id})`}
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={play ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, delay: 0.5, ease }}
      />
      {/* insight spark */}
      <motion.path
        d="M46 38.5c.7 3.6 2.4 5.3 6 6-3.6.7-5.3 2.4-6 6-.7-3.6-2.4-5.3-6-6 3.6-.7 5.3-2.4 6-6Z"
        fill={`url(#spark${id})`}
        style={{ transformOrigin: '46px 44.5px' }}
        initial={play ? { scale: 0, rotate: -90 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 1.0 }}
      />
    </motion.svg>
  )
}

export function Logo({ size = 34, tagline = true, light = false }: { size?: number; tagline?: boolean; light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="leading-none">
        <span className={`block text-[18px] font-semibold tracking-[-0.03em] ${light ? 'text-white' : 'text-ink'}`}>
          Placement<span className="text-gradient font-bold">IQ</span>
        </span>
        {tagline && (
          <span className={`mt-1 block text-[9.5px] font-semibold uppercase tracking-[0.18em] ${light ? 'text-white/60' : 'text-ink-faint'}`}>
            Placement intelligence
          </span>
        )}
      </span>
    </span>
  )
}
