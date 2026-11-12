import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motionConfig } from '../../lib/motion'
import { useDialog } from '../../lib/useDialog'

// "Contact us": colleges reach the PlacementIQ team from the landing page. Enquiries are stored through /api/contact
// and read by platform admins in the console; nothing is emailed from the browser.

const EVENT = 'piq:contact'
/** Opens the contact form from anywhere on the landing page. `topic` (for example a plan name) is noted on the enquiry. */
export const openContact = (topic = '') => window.dispatchEvent(new CustomEvent(EVENT, { detail: topic }))

const FIELD = 'mt-1 w-full rounded-[11px] border border-line bg-white px-3 text-[13.5px] text-ink outline-none transition focus:border-[#b9a8ff]'

export function ContactDialog() {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [form, setForm] = useState({ name: '', college: '', email: '', phone: '', message: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = () => setOpen(false)
  useDialog(open, close, ref)

  useEffect(() => {
    const onOpen = (e: Event) => {
      setTopic(String((e as CustomEvent).detail ?? ''))
      setError(null)
      setSent(false)
      setOpen(true)
    }
    window.addEventListener(EVENT, onOpen)
    return () => window.removeEventListener(EVENT, onOpen)
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, topic }) })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(body?.error || 'Could not send your message. Please try again.')
      setSent(true)
      setForm({ name: '', college: '', email: '', phone: '', message: '', website: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[oklch(0.2_0.04_285/0.4)] px-4 py-8 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-title"
            tabIndex={-1}
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: motionConfig.duration.fast, ease: motionConfig.easing.dramatic } }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
            className="card relative w-full max-w-[480px] p-6 text-left outline-none sm:p-7"
          >
            <button onClick={close} aria-label="Close" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-[18px] text-ink-mute hover:bg-white">×</button>
            {sent ? (
              <div role="status" className="py-6 text-center">
                <p className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#ecfdf3] text-[22px] text-[#067647]">✓</p>
                <h2 id="contact-title" className="mt-4 text-[19px] font-semibold tracking-[-0.02em] text-ink">Thank you. We have your message.</h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-mute">Someone from PlacementIQ will reply to your email, usually within two working days.</p>
                <button onClick={close} className="btn-ink mt-6">Done</button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate={false}>
                <h2 id="contact-title" className="text-[21px] font-semibold tracking-[-0.03em] text-ink">Contact us</h2>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-mute">
                  Bringing PlacementIQ to your college{topic ? <> (<b className="text-ink">{topic}</b>)</> : ''}? Tell us a little and we will get back to you.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-[12px] font-medium text-ink-soft">Your name
                    <input required minLength={2} maxLength={120} autoComplete="name" value={form.name} onChange={set('name')} className={`${FIELD} h-[42px]`} />
                  </label>
                  <label className="block text-[12px] font-medium text-ink-soft">College or organisation
                    <input required minLength={2} maxLength={160} autoComplete="organization" value={form.college} onChange={set('college')} className={`${FIELD} h-[42px]`} />
                  </label>
                  <label className="block text-[12px] font-medium text-ink-soft">Work email
                    <input required type="email" maxLength={200} autoComplete="email" value={form.email} onChange={set('email')} className={`${FIELD} h-[42px]`} />
                  </label>
                  <label className="block text-[12px] font-medium text-ink-soft">Phone <span className="font-normal text-ink-faint">(optional)</span>
                    <input type="tel" maxLength={30} autoComplete="tel" value={form.phone} onChange={set('phone')} className={`${FIELD} h-[42px]`} />
                  </label>
                  <label className="block text-[12px] font-medium text-ink-soft sm:col-span-2">How can we help?
                    <textarea required minLength={10} maxLength={2000} rows={4} value={form.message} onChange={set('message')} className={`${FIELD} resize-y py-2.5 leading-relaxed`} placeholder="Number of students, when your placement season starts, what you want to see…" />
                  </label>
                  {/* Not for people: hidden from sight, keyboards and screen readers. A filled value marks a bot. */}
                  <input tabIndex={-1} aria-hidden="true" autoComplete="off" name="website" value={form.website} onChange={set('website')} className="absolute -left-[9999px] h-0 w-0 opacity-0" />
                </div>
                {error && <p role="alert" className="mt-3 text-[12.5px] text-[#b42318]">{error}</p>}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="submit" disabled={busy} className="btn-ink disabled:opacity-60">{busy ? 'Sending…' : 'Send message'}</button>
                  <p className="text-[11.5px] text-ink-faint">We use these details only to reply. <a href="/privacy" className="underline">Privacy</a></p>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
