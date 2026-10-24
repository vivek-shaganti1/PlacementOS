import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useApp } from '../lib/store'

/**
 * Hold-to-confirm for destructive actions, replacing the browser's blocking confirm() dialog.
 * Pressing fills the button from left to right over `holdMs` (slow and linear: the user is deciding); letting go
 * early snaps the fill back in 200ms (fast: the system is responding). A quick tap explains what holding will do.
 * Works with mouse, touch and keyboard (hold Space or Enter).
 */
export function HoldButton({
  onConfirm,
  children,
  warning,
  className = '',
  holdMs = 1500,
  disabled,
  fill = 'rgba(217,45,32,0.16)',
}: {
  onConfirm: () => void
  children: ReactNode
  /** What happens if they confirm. Shown when someone taps instead of holding, and read by screen readers. */
  warning: string
  className?: string
  holdMs?: number
  disabled?: boolean
  fill?: string
}) {
  const { showToast } = useApp()
  const [holding, setHolding] = useState(false)
  const timer = useRef<number>()
  const started = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const start = () => {
    if (disabled || timer.current) return
    started.current = Date.now()
    setHolding(true)
    timer.current = window.setTimeout(() => {
      timer.current = undefined
      setHolding(false)
      onConfirm()
    }, holdMs)
  }
  const cancel = () => {
    if (!timer.current) return
    window.clearTimeout(timer.current)
    timer.current = undefined
    setHolding(false)
    // A tap, not a hold: say what holding does instead of silently doing nothing.
    if (Date.now() - started.current < 350) showToast(`Press and hold to confirm. ${warning}`)
  }
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, down: boolean) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    if (down && !e.repeat) start()
    if (!down) cancel()
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${typeof children === 'string' ? children : 'Confirm'}: press and hold to confirm. ${warning}`}
      onPointerDown={(e) => e.button === 0 && start()}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => onKey(e, true)}
      onKeyUp={(e) => onKey(e, false)}
      className={`relative isolate overflow-hidden ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: fill,
          clipPath: holding ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
          transition: holding ? `clip-path ${holdMs}ms linear` : 'clip-path 200ms cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      />
      {children}
    </button>
  )
}
