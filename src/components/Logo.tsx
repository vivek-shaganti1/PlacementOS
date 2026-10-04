import { motion, useReducedMotion } from 'motion/react'

/**
 * PlacementIQ mark: a flat pine square holding a geometric "P" (stem plus a single bowl stroke)
 * and a short ledger rule under the bowl, the "measured" line that stands for IQ.
 */
export function LogoMark({ size = 32, animate = false, className }: { size?: number; animate?: boolean; className?: string }) {
  const reduce = useReducedMotion()
  const play = animate && !reduce
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="PlacementIQ" className={className}>
      <rect width="64" height="64" rx="4" fill="#0F5A45" />
      <motion.path
        d="M22 50V14h12.5a10.5 10.5 0 0 1 0 21H22"
        fill="none"
        stroke="#FBF9F4"
        strokeWidth="6"
        strokeLinejoin="miter"
        initial={play ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.rect
        x="34"
        y="44"
        width="12"
        height="5"
        fill="#FBF9F4"
        initial={play ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.3 }}
      />
    </svg>
  )
}

export function Logo({ size = 30, tagline = true, light = false }: { size?: number; tagline?: boolean; light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="leading-none">
        <span className={`block font-display text-[20px] font-medium tracking-[-0.01em] ${light ? 'text-[#FBF9F4]' : 'text-ink'}`}>
          Placement<span className={`font-mono text-[15px] font-medium ${light ? 'text-[#FBF9F4]' : 'text-brand'}`}>IQ</span>
        </span>
        {tagline && (
          <span className={`mt-1 block text-[9.5px] font-semibold uppercase tracking-[0.18em] ${light ? 'text-[#FBF9F4]/60' : 'text-ink-faint'}`}>
            Placement intelligence
          </span>
        )}
      </span>
    </span>
  )
}
