import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useApp } from '../lib/store'
import { errMsg, supabase } from '../lib/supabase'

export type FeedbackTarget = 'next_step' | 'roadmap' | 'assistant' | 'what_if' | 'eligibility' | 'resume'

/**
 * "Was this useful?" for a recommendation. Stored in recommendation_feedback; the student's placement cell
 * sees satisfaction per recommendation type on its overview.
 */
export function FeedbackPrompt({ target, label = 'Was this recommendation useful?', className }: { target: FeedbackTarget; label?: string; className?: string }) {
  const { showToast } = useApp()
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const send = async (h: boolean, text = '') => {
    setBusy(true)
    const { error } = await supabase.from('recommendation_feedback').insert({ target, helpful: h, comment: text.trim().slice(0, 1000) })
    setBusy(false)
    if (error) return showToast(errMsg(error))
    setSent(true)
    showToast('Thanks, your feedback helps your placement cell improve guidance.')
  }

  if (sent) return <p className={`text-[12px] text-ink-mute ${className ?? ''}`}>Thanks for the feedback.</p>
  return (
    <div className={`text-[12.5px] ${className ?? ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-mute">{label}</span>
        <button disabled={busy} onClick={() => send(true)} className="rounded-[10px] border border-line bg-white/70 px-2.5 py-1 font-medium text-ink-soft hover:bg-white">Helpful</button>
        <button disabled={busy} onClick={() => setHelpful(false)} className="rounded-[10px] border border-line bg-white/70 px-2.5 py-1 font-medium text-ink-soft hover:bg-white">Not helpful</button>
      </div>
      <AnimatePresence>
        {helpful === false && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={(e) => {
              e.preventDefault()
              send(false, comment)
            }}
            className="mt-2 flex gap-2 overflow-hidden"
          >
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What would make it better? (optional)" className="field h-[34px] text-[12.5px]" />
            <button disabled={busy} className="btn-primary h-[34px] shrink-0 text-[12px]">Send</button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
