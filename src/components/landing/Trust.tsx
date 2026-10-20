import { motion, type Variants } from 'motion/react'
import { trackSpotlight } from '../Page'
import { IconFileText, IconLock, IconSettings } from '../Icons'

const ease = [0.16, 1, 0.3, 1] as const
const reveal: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }

const cards = [
  { title: 'Row-level security', body: 'Every table (skills, projects, analyses, matches) is locked to your account in the database itself.', Icon: IconLock },
  { title: 'Private resume storage', body: 'Resumes live in a private bucket under your user ID and open through short-lived signed links.', Icon: IconFileText },
  { title: 'Keys stay server-side', body: 'AI and integration calls run in server functions. Nothing secret ever ships to the browser.', Icon: IconSettings },
]

// An abridged version of a real policy from the database (a recruiter only sees applicants of its own college).
const policy = [
  ['k', 'create policy'], ['s', ' "recruiters see applicants"'],
  ['n', ''], ['k', '  on '], ['t', 'job_applications'], ['k', ' for select'],
  ['n', ''], ['k', '  using '], ['t', '('], ['f', 'can_view_user'], ['t', '(user_id));'],
  ['n', ''], ['n', ''], ['c', '-- 39 / 39 access tests pass on production'],
] as const
const tone: Record<string, string> = { k: 'text-[#b9a7ff]', s: 'text-[#8ef5d9]', t: 'text-white/80', f: 'text-[#7dd3fc]', c: 'text-white/40', n: '' }

export function Trust() {
  return (
    <motion.div variants={reveal} className="trust-panel glass-dark relative overflow-hidden rounded-[32px] p-8 text-white md:p-14">
      <div aria-hidden className="trust-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[oklch(0.6_0.22_285)] opacity-40 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-[oklch(0.75_0.14_190)] opacity-20 blur-[90px]" />

      <div className="relative grid grid-cols-1 items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="label-mono !text-white/55"><b className="!text-[#8ef5d9]">05</b> Under the hood</p>
          <h2 className="mt-4 max-w-[620px] text-[clamp(1.9rem,1.3rem+1.8vw,3rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
            Your data is structured, <span className="font-display font-normal italic text-[#8ef5d9]">private</span> and yours.
          </h2>
          <p className="mt-4 max-w-[520px] text-[14px] leading-[1.65] text-white/60">
            Access is enforced by the database, not by the screen. Students, placement cells, recruiters and platform admins each see exactly their slice.
          </p>
        </div>
        <div className="rounded-[18px] border border-white/10 bg-black/30 p-5 font-mono text-[12px] leading-[1.75] shadow-[inset_0_1px_0_oklch(1_0_0/.06)]">
          <div className="mb-3 flex items-center gap-1.5">
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}
            <span className="ml-2 text-[10.5px] text-white/40">supabase/migrations · security</span>
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#12b76a]/15 px-2 py-0.5 text-[10px] text-[#6ee7b7]"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#34d399]" /> 39/39</span>
          </div>
          <code className="block whitespace-pre-wrap">
            {policy.map(([k, text], i) => (k === 'n' ? <br key={i} /> : <span key={i} className={tone[k]}>{text}</span>))}
            <span className="caret" aria-hidden />
          </code>
        </div>
      </div>

      <div className="relative mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map(({ title, body, Icon }) => (
          <div key={title} onPointerMove={trackSpotlight} className="trust-card spotlight relative rounded-[20px] border border-white/10 bg-white/[0.05] p-5 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.08]">
            <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-white/10 text-[#8ef5d9]"><Icon className="h-[18px] w-[18px]" /></span>
            <p className="mt-4 text-[15px] font-semibold">{title}</p>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-white/65">{body}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
