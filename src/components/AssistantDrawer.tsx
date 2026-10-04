import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/store'
import { IconClose, IconSpark } from './Icons'
import { LogoMark } from './Logo'

const suggestions = [
  'Which companies am I closest to unlocking?',
  'Build me a 4-week plan for my weakest skill',
  'How do I improve my resume score?',
  'What should I prepare for Google?',
]

export default function AssistantDrawer() {
  const { assistantOpen, closeAssistant, chat, send, clearChat, thinking } = useApp()
  const [draft, setDraft] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }), [chat.length, assistantOpen, thinking])
  useEffect(() => {
    if (assistantOpen) window.setTimeout(() => input.current?.focus(), 250)
  }, [assistantOpen])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeAssistant()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeAssistant])

  const submit = (text: string) => {
    if (!text.trim() || thinking) return
    send(text.trim())
    setDraft('')
  }

  return (
    <AnimatePresence>
      {assistantOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-[oklch(0.2_0.05_285/0.18)] p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={closeAssistant}
        >
          <motion.aside
            role="dialog"
            aria-label="AI Career Assistant"
            className="glass-strong flex h-full w-[420px] flex-col overflow-hidden rounded-[24px]"
            initial={{ x: 60, opacity: 0, scale: 0.98 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 40, opacity: 0, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="glass-dark relative flex items-center gap-3 overflow-hidden px-5 py-4 text-white">
              <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[oklch(0.6_0.22_285)] opacity-50 blur-[50px]" />
              <LogoMark size={34} />
              <div className="relative flex-1">
                <p className="text-[14px] font-semibold">AI Career Assistant</p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8ef5d9]" /> Grounded in your profile
                </p>
              </div>
              {chat.length > 1 && (
                <button onClick={clearChat} className="relative rounded-lg px-2 py-1 text-[11.5px] font-medium text-white/70 hover:bg-white/10 hover:text-white">
                  Clear
                </button>
              )}
              <button onClick={closeAssistant} aria-label="Close assistant" className="relative grid h-8 w-8 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
                <IconClose className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {chat.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  <p
                    className={`max-w-[86%] whitespace-pre-wrap px-3.5 py-2.5 text-[12.5px] leading-[1.6] ${
                      m.role === 'user'
                        ? 'rounded-[16px] rounded-br-[5px] bg-gradient-to-b from-[#7b5cff] to-[#5a35f0] text-white shadow-[0_6px_16px_rgba(90,53,240,.3)]'
                        : 'rounded-[16px] rounded-bl-[5px] border border-white/80 bg-white/90 text-ink-soft shadow-[var(--shadow-1)]'
                    }`}
                  >
                    {m.text}
                  </p>
                </motion.div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <span className="flex gap-1 rounded-[16px] rounded-bl-[5px] border border-white/80 bg-white/90 px-3.5 py-3" aria-label="Assistant is typing">
                    {[0, 1, 2].map((d) => (
                      <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-brand" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }} />
                    ))}
                  </span>
                </div>
              )}
              {chat.length <= 1 && !thinking && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Try asking</p>
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => submit(s)} className="block w-full rounded-[12px] border border-white/80 bg-white/70 px-3 py-2 text-left text-[12px] text-ink-soft transition hover:bg-white hover:text-ink">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div ref={end} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                submit(draft)
              }}
              className="flex items-center gap-2 border-t border-line bg-white/50 px-3 py-3"
            >
              <input
                ref={input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about companies, skills, rounds..."
                aria-label="Message"
                className="field h-[42px] rounded-full px-4"
              />
              <button disabled={thinking || !draft.trim()} aria-label="Send" className="btn-primary h-[42px] w-[42px] shrink-0 rounded-full p-0">
                <IconSpark className="h-[17px] w-[17px]" />
              </button>
            </form>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
