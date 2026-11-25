import { motion, useReducedMotion } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo, LogoMark } from '../components/Logo'
import { SkipLink } from '../components/SkipLink'
import { ContactDialog, openContact } from '../components/landing/ContactDialog'
import { Desks } from '../components/landing/Desks'
import { Faq } from '../components/landing/Faq'
import { LiquidGlass } from '../components/landing/LiquidGlass'
import { MegaFooter } from '../components/landing/MegaFooter'
import { Plans } from '../components/landing/Plans'
import { Season } from '../components/landing/Season'
import { Stage } from '../components/landing/Stage'
import { TryIt } from '../components/landing/TryIt'
import { SmoothScroll } from '../components/motion/SmoothScroll'
import { motionConfig } from '../lib/motion'
import { usePauseOffscreen } from '../lib/pauseOffscreen'

/**
 * The landing page explains PlacementIQ to people who have never heard of it: the question a student asks, the real
 * engine answering it, how a season runs, who sees what, and what it costs. Type carries the meaning: questions people
 * ask are in Instrument Serif, the answers in Geist.
 */

function Nav() {
  return (
    <div className="sticky top-0 z-40 h-0">
      <div className="mx-auto max-w-[1240px] px-4 pt-3">
        <LiquidGlass className="flex h-[56px] items-center justify-between gap-2 rounded-full pl-4 pr-2">
          <Link to="/" aria-label="PlacementIQ home" className="shrink-0">
            <span className="min-[420px]:hidden"><LogoMark size={32} /></span>
            <span className="hidden min-[420px]:block"><Logo size={30} tagline={false} /></span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-0.5">
            {[['#try', 'Try it'], ['#season', 'How it works'], ['#people', 'Who it’s for'], ['#pricing', 'Pricing']].map(([h, l]) => (
              <a key={h} href={h} className="hidden rounded-full px-3.5 py-2 text-[14px] font-medium text-ink hover:bg-white/60 lg:block">{l}</a>
            ))}
            <Link to="/login" className="whitespace-nowrap rounded-full px-3 py-2 text-[14px] font-medium text-ink hover:bg-white/60 sm:px-3.5">Sign in</Link>
            <button type="button" onClick={() => openContact()} className="lq-btn !h-[42px] whitespace-nowrap !px-5 text-[14px]">Contact us</button>
          </nav>
        </LiquidGlass>
      </div>
    </div>
  )
}

function Section({ id, ask, answer, children, className }: { id: string; ask: string; answer: string; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <section id={id} className={`relative mx-auto max-w-[1240px] px-5 sm:px-6 ${className ?? ''}`}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: motionConfig.distance.md }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: motionConfig.duration.normal, ease: motionConfig.easing.dramatic }}
      >
        <h2 className="max-w-[900px] font-display text-[clamp(2.4rem,1.6rem+3.2vw,4.6rem)] leading-[1.02] tracking-[-0.015em] text-ink">{ask}</h2>
        <p className="mt-4 max-w-[620px] text-[17px] leading-[1.6] text-ink-soft">{answer}</p>
      </motion.div>
      {children}
    </section>
  )
}

const people = [
  ['Students', 'see which companies they can apply to, and what to fix for the rest.'],
  ['Placement cells', 'see who qualifies for every drive, by branch and section.'],
  ['Recruiters', 'see the people who applied to their drive, ranked, with reasons.'],
] as const

export default function Landing() {
  const page = useRef<HTMLDivElement>(null)
  usePauseOffscreen(page, '.wordmark__fill')
  return (
    <SmoothScroll>
      <div ref={page} className="landing relative min-h-[calc(100svh/var(--z))] overflow-x-clip">
        <SkipLink />
        <Nav />
        {!import.meta.env.SSR && <ContactDialog />}

        <main id="main" tabIndex={-1} className="relative outline-none">
          <Stage>
            <section className="relative mx-auto flex min-h-[calc(100svh/var(--z))] max-w-[1240px] flex-col px-5 pb-8 pt-28 sm:px-6">
              <div className="grid flex-1 grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                {/* Text and actions are there from the first paint; nothing above the fold animates in. */}
                <div>
                  <h1 className="max-w-[760px] font-display text-[clamp(3.4rem,1.6rem+7vw,7.6rem)] leading-[0.95] tracking-[-0.025em] text-ink">Will this company take me?</h1>
                  <p className="mt-6 max-w-[540px] text-[clamp(1.06rem,1rem+0.3vw,1.25rem)] leading-[1.55] text-ink">
                    PlacementIQ answers that for every student and every company, and says what to fix when the answer is not yet. Colleges run their whole placement season on it.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <a href="#try" className="lq-btn">Try it with your marks</a>
                    <button type="button" onClick={() => openContact()} className="lq-btn lq-btn--quiet">Bring it to your college</button>
                  </div>
                </div>
                <div aria-hidden className="relative mx-auto grid aspect-square w-[min(58vw,230px)] place-items-center sm:w-[280px] lg:w-[min(34vw,460px)]">
                  <div data-lq="0.02" data-lq-lens data-lq-r="999" className="lq lq-lens absolute inset-0 rounded-full" />
                  <div data-lq-mark className="lq-mark absolute inset-[-7%]"><LogoMark size={200} /></div>
                </div>
              </div>
              <ul className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
                {people.map(([who, what]) => (
                  <li key={who} data-lq="0.5" data-lq-r="24" className="lq rounded-[24px] px-5 py-4 text-[15px] leading-[1.45] text-ink">
                    <span className="font-semibold">{who}</span> {what}
                  </li>
                ))}
              </ul>
            </section>

            <div data-lq-demo>
              <Section id="try" ask="Try it. Move anything." answer="Change the marks and skills of a sample student. Every company is checked again, as you move." className="pb-28 pt-20">
                <TryIt />
              </Section>
            </div>
          </Stage>

          <Section id="season" ask="How does a season run?" answer="Three kinds of people, one shared picture. Nobody keeps their own spreadsheet." className="py-24">
            <Season />
          </Section>

          <Section id="people" ask="Who is it for, and who sees what?" answer="Everyone gets their own view. Where it stops matters as much as what it shows." className="py-24">
            <Desks />
          </Section>

          <Section id="pricing" ask="What would it cost us?" answer="The college subscribes; students never pay. Set your size and the yearly price is worked out below." className="py-24">
            <Plans />
          </Section>

          <Section id="questions" ask="What else do colleges ask?" answer="Straight answers, including the ones that are not a yes." className="py-24">
            <Faq />
          </Section>

          <section id="closing" className="relative mx-auto max-w-[1240px] px-5 pb-24 sm:px-6">
            <div className="lq-silk lq-silk--4 overflow-hidden rounded-[36px] px-6 py-20 sm:px-14 sm:py-28">
              <h2 className="max-w-[760px] font-display text-[clamp(2.6rem,1.6rem+4.4vw,5.4rem)] leading-[0.98] tracking-[-0.02em] text-ink">Ready when your season is?</h2>
              <p className="mt-5 max-w-[520px] text-[17px] leading-[1.6] text-ink">Tell us your college and how many students you have. You can run one batch free for 30 days first.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={() => openContact()} className="lq-btn">Bring it to your college</button>
                <Link to="/login" className="lq-btn lq-btn--quiet">Sign in</Link>
              </div>
            </div>
          </section>
        </main>
        <MegaFooter />
      </div>
    </SmoothScroll>
  )
}
