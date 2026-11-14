import { useEffect, useRef, useState } from 'react'

// Signs a forgotten session out. Students use shared lab computers and placement cells leave consoles open, so a
// session with no activity ends by itself: a warning first, then sign-out. Activity in any tab of this browser counts
// (the last-active time is shared through localStorage), so working in one tab never signs out another.

const KEY = 'piq-last-active'
export const WARN_SECONDS = 60

const lastActive = () => {
  try {
    return Number(localStorage.getItem(KEY)) || 0
  } catch {
    return 0
  }
}
const touch = () => {
  try {
    localStorage.setItem(KEY, String(Date.now()))
  } catch {
    /* private mode: this tab still tracks itself through `local` below */
  }
}

/**
 * @param minutes  idle time allowed before the warning's countdown ends
 * @returns seconds left once the warning is showing (null otherwise), and `stay` to dismiss it
 */
export function useIdleSignOut(minutes: number, signOut: () => void) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const local = useRef(Date.now())
  const out = useRef(signOut)
  out.current = signOut
  const done = useRef(false)

  useEffect(() => {
    done.current = false
    local.current = Date.now()
    touch()
    let last = 0
    // Moving the mouse does not count on its own (a bumped desk is not a person); clicks, keys and scrolling do.
    const onActivity = () => {
      const now = Date.now()
      local.current = now
      if (now - last > 5000) {
        last = now
        touch()
      }
    }
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    for (const e of events) window.addEventListener(e, onActivity, { passive: true })

    const tick = () => {
      if (done.current) return
      const idleMs = Date.now() - Math.max(local.current, lastActive())
      const left = Math.ceil((minutes * 60_000 - idleMs) / 1000)
      if (left <= 0) {
        done.current = true
        setSecondsLeft(null)
        out.current()
      } else setSecondsLeft(left <= WARN_SECONDS ? left : null)
    }
    const id = window.setInterval(tick, 1000)
    // A laptop lid or a background tab pauses timers; check as soon as the page is seen again.
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      for (const e of events) window.removeEventListener(e, onActivity)
    }
  }, [minutes])

  return {
    secondsLeft,
    stay: () => {
      local.current = Date.now()
      touch()
      setSecondsLeft(null)
    },
  }
}
