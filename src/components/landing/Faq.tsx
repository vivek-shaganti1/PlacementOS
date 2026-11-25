const faqs: [string, string][] = [
  ['Do students pay?', 'No. The college subscribes and its students use everything in the plan.'],
  ['Which branches does it cover?', 'Software, AI, cyber security, VLSI, embedded, communications, power, automation, EV, mechanical, automotive, robotics, civil, chemical, biotech and materials. Each is scored on its own subjects.'],
  ['Where do company requirements come from?', 'For general preparation we use typical requirements for each kind of company and say so; details an administrator has checked show the source and date. For a campus drive, the criteria are exactly what your college posted.'],
  ['Does a high score guarantee an offer?', 'No. Scores show how a profile compares with stated requirements. Recruiters decide.'],
  ['Can a student inflate their own score?', 'Self-reported skills are labelled as such and left out of the rankings placement cells and recruiters see. Those use evidence our server fetched from proven accounts, confirmed credentials and the college’s own records.'],
  ['What do we need to install?', 'Nothing. It runs in a browser on a phone or a computer.'],
]

export function Faq() {
  return (
    <div className="mt-10 border-t border-line">
      {faqs.map(([q, a]) => (
        <details key={q} className="group border-b border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-[clamp(1.35rem,1.15rem+0.7vw,1.7rem)] leading-[1.2] text-ink [&::-webkit-details-marker]:hidden">
            {q}
            <span aria-hidden className="text-[24px] font-sans font-light text-ink-mute transition-transform duration-200 group-open:rotate-45">+</span>
          </summary>
          <p className="max-w-[680px] pb-6 text-[16px] leading-[1.65] text-ink-soft">{a}</p>
        </details>
      ))}
    </div>
  )
}
