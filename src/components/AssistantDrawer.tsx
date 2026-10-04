import { useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/store'
import { IconBot, IconClose, IconSpark } from './Icons'

export default function AssistantDrawer() {
  const { assistantOpen, closeAssistant, chat, send, clearChat } = useApp()
  const [draft, setDraft] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [chat.length, assistantOpen])
  if (!assistantOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onMouseDown={closeAssistant}>
      <div
        className="flex h-full w-[400px] flex-col bg-white shadow-panel"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
            <IconBot className="h-[18px] w-[18px]" />
          </span>
          <p className="flex-1 text-[14px] font-semibold">AI Career Assistant</p>
          {chat.length > 1 && (
            <button onClick={clearChat} className="rounded-md px-2 py-1 text-[11.5px] font-medium text-ink-mute hover:bg-[#f3f4f6]">
              Clear
            </button>
          )}
          <button onClick={closeAssistant} className="grid h-8 w-8 place-items-center rounded-lg text-ink-mute hover:bg-[#f3f4f6]">
            <IconClose className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="scroll-thin flex-1 space-y-3 overflow-y-auto bg-canvas px-5 py-4">
          {chat.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <p
                className={`max-w-[86%] rounded-xl2 px-3.5 py-2.5 text-[12.5px] leading-[1.6] ${
                  m.role === 'user' ? 'bg-brand text-white' : 'border border-line bg-white text-ink-soft'
                }`}
              >
                {m.text}
              </p>
            </div>
          ))}
          <div ref={end} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!draft.trim()) return
            send(draft.trim())
            setDraft('')
          }}
          className="flex items-center gap-2 border-t border-line px-4 py-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about companies, skills, rounds..."
            className="h-[38px] flex-1 rounded-full border border-line bg-[#f7f8fa] px-4 text-[12.5px] outline-none focus:border-[#d5cbff] focus:bg-white"
          />
          <button className="grid h-[38px] w-[38px] place-items-center rounded-full bg-brand text-white hover:bg-brand-dark">
            <IconSpark className="h-[17px] w-[17px]" />
          </button>
        </form>
      </div>
    </div>
  )
}
