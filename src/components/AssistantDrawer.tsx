import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/store'
import { IconClose } from './Icons'

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
          className="fixed inset-0 z-50 flex justify-end bg-[#1E1D1A]/25 p-2 sm:p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={closeAssistant}
        >
          <motion.aside
            role="dialog"
            aria-label="AI Career Assistant"
            className="glass-strong flex h-full w-full max-w-[420px] flex-col overflow-hidden rounded-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-rule px-5 py-4">
              <div className="flex-1">
                <p className="font-display text-[19px] font-medium text-ink">Career assistant</p>
                <p className="text-[11.5px] text-ink-mute">Answers use your profile, resume and eligibility</p>
              </div>
              {chat.length > 1 && (
                <button onClick={clearChat} className="px-2 py-1 text-[12px] font-medium text-ink-mute hover:underline">
                  Clear
                </button>
              )}
              <button onClick={closeAssistant} aria-label="Close assistant" className="grid h-8 w-8 place-items-center text-ink-mute hover:bg-surface-2">
                <IconClose className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {chat.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  <p
                    className={`max-w-[86%] whitespace-pre-wrap px-3.5 py-2.5 text-[12.5px] leading-[1.6] ${
                      m.role === 'user'
                        ? 'rounded-[3px] bg-brand text-[#FBF9F4]'
                        : 'rounded-[3px] border border-rule bg-surface-2 text-ink-soft'
                    }`}
                  >
                    {m.text}
                  </p>
                </motion.div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <span className="flex gap-1 rounded-[3px] rounded-bl-[3px] border border-rule bg-surface-2 px-3.5 py-3" aria-label="Assistant is typing">
                    {[0, 1, 2].map((d) => (
                      <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-brand" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }} />
                    ))}
                  </span>
                </div>
              )}
              {chat.length <= 1 && !thinking && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Try asking</p>
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => submit(s)} className="block w-full rounded-[3px] border border-rule bg-surface-2 px-3 py-2 text-left text-[12px] text-ink-soft hover:bg-surface-2 hover:text-ink">
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
              className="flex items-center gap-2 border-t border-rule bg-surface px-3 py-3"
            >
              <input
                ref={input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about companies, skills, rounds..."
                aria-label="Message"
                className="field h-[42px] px-3"
              />
              <button disabled={thinking || !draft.trim()} className="btn-primary h-[42px] shrink-0 px-4">
                Send
              </button>
            </form>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
