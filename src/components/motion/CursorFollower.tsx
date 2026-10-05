import { motion, useMotionValue, useSpring } from 'motion/react'
import { useEffect, useState } from 'react'
import { intensity, useMotionTier } from '../../lib/motion'

/**
 * A soft glow that trails the pointer across a section. Decorative only: pointer-events none, hidden from
 * assistive tech, off on touch, low-power and reduced motion. One passive pointermove listener on the window.
 */
export function CursorFollower({ size = 420, color = 'rgba(124, 92, 255, 0.18)' }: { size?: number; color?: string }) {
  const tier = useMotionTier()
  const x = useSpring(useMotionValue(-999), { stiffness: 140, damping: 22, mass: 0.6 })
  const y = useSpring(useMotionValue(-999), { stiffness: 140, damping: 22, mass: 0.6 })
  const [visible, setVisible] = useState(false)
  const on = intensity[tier].cursor

  useEffect(() => {
    if (!on) return
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x.set(e.clientX - size / 2)
      y.set(e.clientY - size / 2)
      setVisible(true)
    }
    const leave = () => setVisible(false)
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
    }
  }, [on, size, x, y])

  if (!on) return null
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-0 rounded-full"
      style={{ x, y, width: size, height: size, background: `radial-gradient(closest-side, ${color}, transparent)`, opacity: visible ? 1 : 0, transition: 'opacity .4s' }}
    />
  )
}
