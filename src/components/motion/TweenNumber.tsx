import { animate, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useRef } from 'react'
import { motionConfig } from '../../lib/motion'

/**
 * A number that glides from its previous value to a new one, so a change the user just caused (a slider, a filter) reads
 * as movement rather than a swap. It never animates on first render: the initial value is drawn final, which keeps the
 * app's "no animation on load" rule. Each frame writes straight to the DOM node, so nothing re-renders per frame.
 * Reduced motion: the new value appears instantly. Import from this file directly (the motion index also exports GSAP).
 */
export function TweenNumber({ value, format = (n) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(value)
  const reduce = useReducedMotion()
  // React only ever renders the first text; every later value is written by the effect, so React and the tween never
  // fight over the node, and a layout effect means the final value is never painted for a frame before the tween starts.
  const first = useRef(format(value)).current

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const from = shown.current
    if (from === value || reduce) {
      shown.current = value
      el.textContent = format(value)
      return
    }
    const controls = animate(from, value, {
      duration: motionConfig.duration.fast,
      ease: motionConfig.easing.smooth,
      onUpdate: (v) => {
        shown.current = v
        el.textContent = format(v)
      },
    })
    return () => controls.stop()
    // format is a fresh function each render; only the value and the preference should restart the tween.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce])

  return (
    <span ref={ref} className="tabular-nums">
      {first}
    </span>
  )
}
