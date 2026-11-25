import { ScrollHighlight } from '../motion/ScrollHighlight'
import { Rise } from './Section'

/** Why we built it: one statement that fills with ink as the reader reaches it, over a slow prism of light. */
export function Manifesto() {
  return (
    <Rise>
      <div className="glass relative overflow-hidden rounded-[32px] px-6 py-14 sm:px-10 md:px-[72px] md:py-28">
        <div aria-hidden className="prism" />
        <div aria-hidden className="prism prism--thin" style={{ animationDelay: '-5s' }} />
        <h2 className="label-mono relative"><b>02</b> Why we built it</h2>
        <ScrollHighlight className="relative mt-7 max-w-[940px] text-[clamp(1.4rem,1rem+1.6vw,2.35rem)] font-medium leading-[1.36] tracking-[-0.028em] text-ink">
          Every placement season, thousands of students guess. They guess which drives they qualify for, which skill
          matters, and why a shortlist never came. Cut-offs say who is out, never what would let them in. PlacementIQ
          replaces the guess with a reason for every company, and a next step you can act on today.
        </ScrollHighlight>
      </div>
    </Rise>
  )
}
