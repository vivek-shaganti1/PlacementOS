import { useRef } from 'react'
import { useAuth } from '../lib/auth'
import { useDialog } from '../lib/useDialog'
import { useIdleSignOut } from '../lib/useIdleSignOut'

/** Minutes without a click, key press or scroll before a session ends. Admin consoles hold more, so they close sooner. */
export const IDLE_MINUTES = { super: 15, org: 15, recruiter: 30, student: 30 } as const

/** Warns a minute before an idle session is signed out, then signs out. Rendered once, inside the signed-in shell. */
export function IdleGuard() {
  const { role, signOut } = useAuth()
  // ?idle=<minutes> shortens the wait on a local development host only, so the behaviour can be tested.
  const override = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) ? Number(new URLSearchParams(window.location.search).get('idle')) : 0
  const { secondsLeft, stay } = useIdleSignOut(override > 0 ? override : IDLE_MINUTES[role], () => void signOut())
  const ref = useRef<HTMLDivElement>(null)
  const open = secondsLeft !== null
  useDialog(open, stay, ref)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[oklch(0.2_0.04_285/0.35)] px-4 backdrop-blur-[2px]">
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-body" tabIndex={-1} className="card w-full max-w-[380px] p-6 text-left outline-none">
        <h2 id="idle-title" className="text-[16px] font-semibold text-ink">Still there?</h2>
        <p id="idle-body" className="mt-1.5 text-[13px] leading-relaxed text-ink-mute">
          You have not used PlacementIQ for a while. To keep your account safe on shared computers, you will be signed out in{' '}
          <b className="tabular-nums text-ink" aria-live="off">{secondsLeft}</b> seconds.
        </p>
        <div className="mt-5 flex gap-2">
          <button onClick={stay} className="btn-primary">Stay signed in</button>
          <button onClick={() => void signOut()} className="btn-glass">Sign out now</button>
        </div>
      </div>
    </div>
  )
}
