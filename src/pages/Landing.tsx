import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Logo, LogoMark } from '../components/Logo'
import { SkipLink } from '../components/SkipLink'
import { ContactDialog, openContact } from '../components/landing/ContactDialog'
import { Desks } from '../components/landing/Desks'
import { Faq } from '../components/landing/Faq'
import { HowItWorks } from '../components/landing/HowItWorks'
import { LiquidGlass } from '../components/landing/LiquidGlass'
import { Manifesto } from '../components/landing/Manifesto'
import { MegaFooter } from '../components/landing/MegaFooter'
import { Plans } from '../components/landing/Plans'
import { Roles, WhoSees } from '../components/landing/Roles'
import { Accent, Heading, Rise, Section } from '../components/landing/Section'
import { Season } from '../components/landing/Season'
import { Stage } from '../components/landing/Stage'
import { TryIt } from '../components/landing/TryIt'
import { Aurora } from '../components/effects/Aurora'
import { SmoothScroll } from '../components/motion/SmoothScroll'
import { TextReveal } from '../components/motion/TextReveal'
import { usePauseOffscreen } from '../lib/pauseOffscreen'

/**
 * The landing page explains PlacementIQ to people who have never heard of it: the question a student asks, the real
 * engine answering it, why it exists, what each person sees, how it works and what it costs. The hero and demo stand on the
 * liquid stage; everything below is glass over the aurora.
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
            {[['#try', 'Try it'], ['#people', 'Who it’s for'], ['#how', 'How it works'], ['#pricing', 'Pricing']].map(([h, l]) => (
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

const people = [
  ['Students', 'see which companies they can apply to, and what to fix for the rest.'],
  ['Placement cells', 'see who qualifies for every drive, by branch and section.'],
  ['Recruiters', 'see the people who applied to their drive, ranked, with reasons.'],
] as const

export default function Landing() {
  const page = useRef<HTMLDivElement>(null)
  // Decorative loops only run while they are on screen.
  usePauseOffscreen(page, '.wordmark__fill, .prism, .gradient-border')
  return (
    <SmoothScroll>
      <div ref={page} className="landing relative min-h-[calc(100svh/var(--z))] overflow-x-clip">
        <SkipLink />
        <Aurora />
        <Nav />
        {!import.meta.env.SSR && <ContactDialog />}

        <main id="main" tabIndex={-1} className="relative outline-none">
          <Stage>
            <section className="relative mx-auto flex min-h-[calc(100svh/var(--z))] max-w-[1240px] flex-col px-5 pb-8 pt-28 sm:px-6">
              <div className="grid flex-1 grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                {/* Text and actions are there from the first paint; nothing above the fold animates in. */}
                <div>
                  <h1 className="max-w-[760px] font-display text-[clamp(3.4rem,1.6rem+7vw,7.6rem)] leading-[0.95] tracking-[-0.025em] text-ink">Will this company take me?</h1>
                  <p data-lq-text className="mt-6 max-w-[540px] text-[clamp(1.06rem,1rem+0.3vw,1.25rem)] leading-[1.55] text-ink">
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
              <Section id="try" className="pb-60 pt-20">
                <Heading n="01" label="Try it" body="Change the marks and skills of a sample student. Every company is checked again as you move.">
                  Try it. <Accent>Move anything.</Accent>
                </Heading>
                <TryIt />
              </Section>
            </div>
          </Stage>

          <Section id="why" className="pb-16">
            <Manifesto />
          </Section>

          <Section id="roles" className="py-20">
            <Roles />
          </Section>

          <Section id="people" className="py-20">
            <Heading n="04" label="Who it’s for" serif body="Everyone gets their own view. Where it stops matters as much as what it shows.">Who is it for, and who sees what?</Heading>
            <Desks />
            <WhoSees />
          </Section>

          <Section id="how" className="py-20">
            <Rise><p className="label-mono"><b>05</b> How it works</p></Rise>
            <TextReveal className="mt-3 max-w-[960px] text-[clamp(2.1rem,1.4rem+2.4vw,3.6rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-ink">From sign-up to offer, in four moves.</TextReveal>
            <HowItWorks />
          </Section>

          <Section id="season" className="py-20">
            <Heading n="06" label="A placement season" serif body="Three kinds of people, one shared picture. Nobody keeps their own spreadsheet.">How does a season run?</Heading>
            <Season />
          </Section>

          <Section id="pricing" className="py-20">
            <Plans />
          </Section>

          <Section id="questions" className="py-20">
            <Heading n="08" label="Questions">What else do colleges <Accent>ask?</Accent></Heading>
            <Faq />
          </Section>

          <Section id="closing" className="pb-28 pt-12">
            <Rise>
              <div className="gradient-border rounded-[36px]">
                <div className="glass-strong relative overflow-hidden rounded-[36px] px-6 py-20 text-center sm:px-14 sm:py-24">
                  <div aria-hidden className="prism opacity-70" />
                  <LogoMark size={64} className="relative mx-auto" />
                  <h2 className="relative mx-auto mt-7 max-w-[760px] text-[clamp(2.3rem,1.4rem+3vw,4rem)] font-semibold leading-[1.04] tracking-[-0.042em] text-ink">
                    Walk into every drive <Accent>prepared.</Accent>
                  </h2>
                  <p className="relative mx-auto mt-5 max-w-[540px] text-[17px] leading-[1.6] text-ink">Tell us your college and how many students you have. You can run one batch free for 30 days first.</p>
                  <div className="relative mt-9 flex flex-wrap justify-center gap-3">
                    <button type="button" onClick={() => openContact()} className="lq-btn">Bring it to your college</button>
                    <Link to="/login" className="lq-btn lq-btn--quiet">Sign in</Link>
                  </div>
                </div>
              </div>
            </Rise>
          </Section>
        </main>
        <MegaFooter />
      </div>
    </SmoothScroll>
  )
}
