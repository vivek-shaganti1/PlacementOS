import { useEffect, useRef, type RefObject } from 'react'

/** Open overlays, innermost last. Escape and Tab only act on the topmost one. */
const stack: symbol[] = []

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialog behaviour for drawers, sheets and overlay panels: when it opens, remember what had focus and move focus inside;
 * keep Tab inside while it is open (`trap`); Escape closes only the topmost overlay; focus returns to the trigger on close.
 */
export function useDialog(open: boolean, onClose: () => void, ref: RefObject<HTMLElement>, { trap = true }: { trap?: boolean } = {}) {
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!open) return
    const id = Symbol('dialog')
    stack.push(id)
    const trigger = document.activeElement as HTMLElement | null
    const isTop = () => stack[stack.length - 1] === id

    // Focus the first control once the element exists (it may mount a frame later inside AnimatePresence).
    const raf = requestAnimationFrame(() => {
      const el = ref.current
      if (el && !el.contains(document.activeElement)) (el.querySelector<HTMLElement>(FOCUSABLE) ?? el).focus({ preventScroll: true })
    })

    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return
      if (e.key === 'Escape') {
        e.preventDefault()
        close.current()
        return
      }
      if (e.key !== 'Tab' || !trap || !ref.current) return
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const inside = ref.current.contains(document.activeElement)
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      const at = stack.indexOf(id)
      if (at >= 0) stack.splice(at, 1)
      // Back to whatever opened it, if that is still on the page.
      if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true })
    }
  }, [open, trap, ref])
}
