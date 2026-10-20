import { motion, useReducedMotion } from 'motion/react'
import { type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { LogoMark } from '../Logo'
import { useLenis } from '../motion'

const columns: { title: string; links: [string, string][] }[] = [
  { title: 'Product', links: [['#features', 'Features'], ['#roles', 'For colleges'], ['#how', 'How it works'], ['#pricing', 'Pricing']] },
  { title: 'Platform', links: [['/signup', 'Create an account'], ['/login', 'Sign in'], ['/login', 'Placement cell login'], ['/login', 'Recruiter login']] },
  { title: 'Trust', links: [['/security', 'Security'], ['/privacy', 'Privacy policy'], ['/terms', 'Terms of use'], ['/privacy#contact', 'Contact']] },
]

/** Pointer position as CSS variables for the wordmark spotlight (no React state per move). */
const track = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
  e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
}

function FooterLink({ to, children }: { to: string; children: string }) {
  const cls = 'group inline-flex items-center gap-1.5 text-[13.5px] text-white/60 transition-colors hover:text-white'
  const inner = (
    <>
      <span className="h-px w-0 bg-[#8ef5d9] transition-all duration-300 group-hover:w-3" />
      {children}
    </>
  )
  return to.startsWith('#') ? <a href={to} className={cls}>{inner}</a> : <Link to={to} className={cls}>{inner}</Link>
}

export function MegaFooter() {
  const reduce = useReducedMotion()
  const lenis = useLenis()
  const toTop = () => (lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }))

  return (
    <footer className="mega-footer relative mt-10 overflow-hidden bg-[#07060f] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_20%_0%,oklch(0.45_0.2_285/.35),transparent_70%),radial-gradient(50%_45%_at_90%_10%,oklch(0.6_0.13_200/.22),transparent_70%)]" />
      <div aria-hidden className="mega-footer__grain pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-[1160px] px-6 pt-20">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <LogoMark size={40} />
              <p className="text-[18px] font-semibold tracking-[-0.02em]">Placement<span className="text-gradient font-bold">IQ</span></p>
            </div>
            <p className="mt-4 max-w-[320px] text-[13.5px] leading-[1.65] text-white/55">
              Placement intelligence for colleges and students: a reason for every company, and the next step to take.
            </p>
            <Link to="/signup" className="mt-6 inline-flex h-[44px] items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-[#0d0a24] shadow-[0_10px_30px_rgba(142,245,217,.15)] transition hover:bg-[#f1edff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ef5d9]">
              Start free <span className="kbd kbd-light hidden sm:inline-grid">G</span>
            </Link>
          </div>
          {columns.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/35">{c.title}</p>
              <ul className="mt-4 space-y-3">
                {c.links.map(([to, label]) => <li key={label}><FooterLink to={to}>{label}</FooterLink></li>)}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* The wordmark: rises out of a mask once, colour flows slowly, a light follows the pointer on desktop. */}
      <div onPointerMove={track} className="wordmark relative mt-16 select-none overflow-hidden px-2" aria-label="PlacementIQ">
        <motion.p
          aria-hidden
          initial={reduce ? false : { y: '60%', opacity: 0 }}
          whileInView={{ y: '0%', opacity: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="wordmark__text relative text-center font-semibold leading-[0.8] tracking-[-0.07em]"
        >
          <span className="wordmark__outline">PlacementIQ</span>
          <span className="wordmark__fill">PlacementIQ</span>
          <span className="wordmark__light">PlacementIQ</span>
        </motion.p>
      </div>

      <div className="relative mx-auto flex max-w-[1160px] flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 px-6 py-6 text-[12px] text-white/45">
        <span>© {new Date().getFullYear()} PlacementIQ</span>
        <span className="hidden sm:inline">Built for campus placement season</span>
        <div className="ml-auto flex flex-wrap items-center gap-5">
          <Link to="/privacy" className="hover:text-white">Privacy</Link>
          <Link to="/terms" className="hover:text-white">Terms</Link>
          <Link to="/security" className="hover:text-white">Security</Link>
          <button onClick={toTop} className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-white/70 transition hover:border-white/40 hover:text-white">
            Back to top <span className="transition-transform duration-200 group-hover:-translate-y-0.5">↑</span>
          </button>
        </div>
      </div>
    </footer>
  )
}
