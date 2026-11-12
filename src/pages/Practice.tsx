import { useMemo, useState } from 'react'
import { Card, Page, Stat } from '../components/Page'
import { useProfile } from '../lib/auth'
import { practiceTopicsFor } from '../lib/prep'
import { useApp } from '../lib/store'
import { istDay, istDayBefore, istDayNumber } from '../lib/dates'

type Q = { id: string; q: string; options: string[]; answer: number; why: string }

const bank: Record<string, { level: string; questions: Q[] }> = {
  'Arrays & Strings': {
    level: 'Easy-Medium',
    questions: [
      { id: 'arr-1', q: 'Given an array of integers, return indices of the two numbers that add up to a target. Which approach gives O(n) time?', options: ['Sort then two pointers', 'Hash map of complements', 'Nested loops', 'Binary search per element'], answer: 1, why: 'One pass with a hash map of complements is O(n) time, O(n) space.' },
      { id: 'arr-2', q: 'Longest substring without repeating characters is best solved with…', options: ['Sliding window + set/map', 'Sorting the string', 'Dynamic programming table O(n²)', 'Recursion with memo'], answer: 0, why: 'A sliding window with a last-seen map runs in O(n).' },
      { id: 'arr-3', q: 'Maximum subarray sum (Kadane) runs in…', options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'], answer: 2, why: 'Kadane keeps a running best ending at each index: O(n).' },
    ],
  },
  'Linked Lists': {
    level: 'Medium',
    questions: [
      { id: 'll-1', q: 'Detect a cycle in a linked list with O(1) extra space:', options: ['Hash set of visited nodes', 'Floyd’s slow/fast pointers', 'Reverse the list', 'Sort the nodes'], answer: 1, why: 'Floyd’s tortoise and hare meets inside the cycle using two pointers.' },
      { id: 'll-2', q: 'Find the middle node in one pass:', options: ['Count then walk', 'Slow pointer +1, fast pointer +2', 'Recursion', 'Stack'], answer: 1, why: 'When fast reaches the end, slow is at the middle.' },
    ],
  },
  'Trees & Graphs': {
    level: 'Medium-Hard',
    questions: [
      { id: 'tg-1', q: 'Shortest path in an unweighted graph:', options: ['DFS', 'BFS', 'Dijkstra with a heap', 'Topological sort'], answer: 1, why: 'BFS explores by layers, so first arrival is the shortest path.' },
      { id: 'tg-2', q: 'In-order traversal of a BST yields…', options: ['Random order', 'Level order', 'Sorted order', 'Reverse insertion order'], answer: 2, why: 'Left, node, right visits BST keys in ascending order.' },
      { id: 'tg-3', q: 'Detecting a cycle in a directed graph commonly uses…', options: ['Union-find', 'DFS with recursion-stack colors', 'BFS levels', 'Prim’s algorithm'], answer: 1, why: 'A back edge to a node on the current DFS stack means a cycle.' },
    ],
  },
  'Dynamic Programming': {
    level: 'Hard',
    questions: [
      { id: 'dp-1', q: 'Climbing stairs (1 or 2 steps) follows which recurrence?', options: ['f(n)=f(n-1)*2', 'f(n)=f(n-1)+f(n-2)', 'f(n)=n!', 'f(n)=f(n/2)+1'], answer: 1, why: 'The last step is either 1 or 2, so it’s Fibonacci.' },
      { id: 'dp-2', q: '0/1 knapsack with n items and capacity W runs in…', options: ['O(n + W)', 'O(nW)', 'O(2^n) only', 'O(n log W)'], answer: 1, why: 'The classic table has n×W states, each O(1).' },
    ],
  },
  'SQL Queries': {
    level: 'Medium',
    questions: [
      { id: 'sql-1', q: 'Which clause filters groups after aggregation?', options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], answer: 1, why: 'WHERE filters rows before grouping; HAVING filters groups.' },
      { id: 'sql-2', q: 'A LEFT JOIN returns…', options: ['Only matching rows', 'All rows from the right table', 'All rows from the left table plus matches', 'The Cartesian product'], answer: 2, why: 'Unmatched left rows appear with NULLs on the right.' },
    ],
  },
  // Core branches: the fundamentals a campus written test and technical round open with.
  'Digital & Analog Electronics': {
    level: 'Core',
    questions: [
      { id: 'ece-1', q: 'How many flip-flops does a decade (mod-10) ripple counter need?', options: ['3', '4', '5', '10'], answer: 1, why: 'Three flip-flops count only to 8; four count to 16, which covers 10 states.' },
      { id: 'ece-2', q: 'A CMOS inverter draws almost no static power because…', options: ['Its supply voltage is low', 'One of its two transistors is always off in a steady state', 'It has no gate capacitance', 'It switches very slowly'], answer: 1, why: 'In either logic state the pull-up or the pull-down transistor is off, so there is no path from supply to ground.' },
      { id: 'ece-3', q: 'A signal is band-limited to 4 kHz. The minimum sampling rate that avoids aliasing is…', options: ['2 kHz', '4 kHz', '8 kHz', '16 kHz'], answer: 2, why: 'The Nyquist rate is twice the highest frequency: 2 × 4 kHz = 8 kHz.' },
    ],
  },
  'Machines & Power Systems': {
    level: 'Core',
    questions: [
      { id: 'eee-1', q: 'The synchronous speed of a 4-pole induction motor on a 50 Hz supply is…', options: ['750 rpm', '1000 rpm', '1500 rpm', '3000 rpm'], answer: 2, why: 'Ns = 120 f / P = 120 × 50 / 4 = 1500 rpm.' },
      { id: 'eee-2', q: 'Transformer cores are built from thin laminations mainly to reduce…', options: ['Copper loss', 'Eddy current loss', 'Hysteresis loss', 'Leakage flux'], answer: 1, why: 'Laminations break up the paths of eddy currents in the core, cutting that loss.' },
      { id: 'eee-3', q: 'The power factor of a purely inductive load is…', options: ['Unity', '0.5 lagging', 'Zero lagging', 'Zero leading'], answer: 2, why: 'Current lags voltage by 90°, so cos 90° = 0, lagging.' },
    ],
  },
  'Thermodynamics, Mechanics & Design': {
    level: 'Core',
    questions: [
      { id: 'mech-1', q: 'A Carnot engine works between 600 K and 300 K. Its efficiency is…', options: ['25%', '50%', '75%', '100%'], answer: 1, why: 'η = 1 − Tc/Th = 1 − 300/600 = 50%.' },
      { id: 'mech-2', q: 'A simply supported beam of span L carries a point load W at mid-span. The maximum bending moment is…', options: ['WL/2', 'WL/4', 'WL/8', 'WL²/8'], answer: 1, why: 'Each support carries W/2, so the moment at the centre is (W/2)(L/2) = WL/4.' },
      { id: 'mech-3', q: 'Flow in a circular pipe is generally laminar when the Reynolds number is below about…', options: ['500', '2000', '4000', '10000'], answer: 1, why: 'Pipe flow stays laminar up to a Reynolds number of roughly 2000 to 2300.' },
    ],
  },
  'Structures & Construction': {
    level: 'Core',
    questions: [
      { id: 'civ-1', q: 'In IS 456, concrete grade M25 has a characteristic compressive strength of…', options: ['25 N/mm² at 7 days', '25 N/mm² at 28 days', '25 kN/m² at 28 days', '250 N/mm² at 28 days'], answer: 1, why: 'The number is the 28-day characteristic cube strength in N/mm².' },
      { id: 'civ-2', q: 'The Standard Proctor test is used to find…', options: ['The bearing capacity of soil', 'Optimum moisture content and maximum dry density', 'The permeability of soil', 'The liquid limit'], answer: 1, why: 'It is a compaction test that gives the moisture content at which dry density is highest.' },
      { id: 'civ-3', q: 'In the Critical Path Method, the critical path is…', options: ['The shortest path through the network', 'The path with the most activities', 'The longest path, with zero total float', 'The path with the highest cost'], answer: 2, why: 'The longest path fixes the project duration; its activities have no float.' },
    ],
  },
  'Process Engineering': {
    level: 'Core',
    questions: [
      { id: 'chem-1', q: 'For a positive-order reaction at the same conversion, which reactor needs the smaller volume?', options: ['CSTR', 'Plug flow reactor', 'Both need the same', 'It depends only on temperature'], answer: 1, why: 'A PFR works at higher average concentration than a CSTR, so the rate is higher and the volume smaller.' },
      { id: 'chem-2', q: 'The ratio of momentum diffusivity to thermal diffusivity is the…', options: ['Reynolds number', 'Nusselt number', 'Prandtl number', 'Schmidt number'], answer: 2, why: 'Pr = ν / α. The Schmidt number is the mass-transfer counterpart.' },
      { id: 'chem-3', q: 'Running a distillation column at total reflux gives…', options: ['The maximum number of stages', 'The minimum number of stages', 'The maximum product rate', 'The minimum reboiler duty'], answer: 1, why: 'At total reflux the operating lines sit on the diagonal, which needs the fewest stages (and gives no product).' },
    ],
  },
  Biotechnology: {
    level: 'Core',
    questions: [
      { id: 'bio-1', q: 'In PCR, the denaturation step is typically run at about…', options: ['37 °C', '55 °C', '72 °C', '95 °C'], answer: 3, why: 'Around 94 to 95 °C separates the two DNA strands; annealing and extension run cooler.' },
      { id: 'bio-2', q: 'In Michaelis-Menten kinetics, Km is the substrate concentration at which the rate is…', options: ['Zero', 'Half of Vmax', 'Equal to Vmax', 'Twice Vmax'], answer: 1, why: 'Setting v = Vmax/2 in the rate equation gives [S] = Km.' },
      { id: 'bio-3', q: 'Which technique separates proteins mainly by molecular weight?', options: ['SDS-PAGE', 'Isoelectric focusing', 'PCR', 'ELISA'], answer: 0, why: 'SDS gives proteins a uniform charge-to-mass ratio, so they migrate by size.' },
    ],
  },
  'Materials & Metallurgy': {
    level: 'Core',
    questions: [
      { id: 'mat-1', q: 'The eutectoid composition in the iron-carbon system is about…', options: ['0.02% C', '0.8% C', '2.1% C', '4.3% C'], answer: 1, why: 'Austenite transforms to pearlite at about 0.76 to 0.8% carbon; 4.3% is the eutectic.' },
      { id: 'mat-2', q: 'Which hardness test uses a square-based diamond pyramid indenter?', options: ['Brinell', 'Rockwell B', 'Vickers', 'Shore'], answer: 2, why: 'Vickers uses a diamond pyramid; Brinell uses a ball.' },
      { id: 'mat-3', q: 'Rapidly quenching a plain carbon steel from the austenite region produces…', options: ['Pearlite', 'Ferrite', 'Martensite', 'Cementite'], answer: 2, why: 'Fast cooling suppresses diffusion, so austenite shears into hard martensite.' },
    ],
  },
  'Aptitude & Logical': {
    level: 'Easy',
    questions: [
      { id: 'apt-1', q: 'A train 120 m long passes a pole in 6 s. Its speed is…', options: ['60 km/h', '72 km/h', '80 km/h', '20 km/h'], answer: 1, why: '120/6 = 20 m/s = 72 km/h.' },
      { id: 'apt-2', q: 'Next in the series 2, 6, 12, 20, 30, …?', options: ['40', '42', '44', '36'], answer: 1, why: 'Differences grow by 2: +12 gives 42 (n(n+1)).' },
    ],
  },
}


export default function Practice() {
  const { attempts, recordAttempt } = useApp()
  const profile = useProfile()
  // The sets a student sees follow their branch: core subjects for core branches, programming for software tracks.
  const topics = useMemo(() => practiceTopicsFor(profile).filter((t) => bank[t]), [profile])
  const allQs = useMemo(() => topics.flatMap((t) => bank[t].questions), [topics])
  const [topic, setTopic] = useState<string | null>(null)
  const [current, setCurrent] = useState<Q>(() => allQs[istDayNumber() % allQs.length])
  const [picked, setPicked] = useState<number | null>(null)

  const solvedIds = useMemo(() => new Set(attempts.filter((a) => a.correct).map((a) => a.question_id)), [attempts])
  const accuracy = attempts.length ? Math.round((attempts.filter((a) => a.correct).length / attempts.length) * 100) : 0
  const streak = useMemo(() => {
    // Days are counted in India time, so late-night practice counts for the day the student is living in.
    const days = new Set(attempts.map((a) => istDay(a.created_at)))
    let n = 0
    let d = istDay()
    if (!days.has(d)) d = istDayBefore(d)
    while (days.has(d)) {
      n++
      d = istDayBefore(d)
    }
    return n
  }, [attempts])

  const start = (t: string) => {
    const qs = bank[t].questions
    const next = qs.find((q) => !solvedIds.has(q.id)) ?? qs[Math.floor(Math.random() * qs.length)]
    setTopic(t)
    setCurrent(next)
    setPicked(null)
    document.getElementById('practice-question')?.scrollIntoView({ behavior: 'smooth' })
  }

  const pick = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    recordAttempt(current.id, i, i === current.answer)
  }

  return (
    <Page title="Practice Arena" subtitle="Targeted problem sets based on the rounds your companies actually run.">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Problems solved" value={`${solvedIds.size}`} sub={`of ${allQs.length} in the bank`} />
        <Stat label="Current streak" value={`${streak} day${streak === 1 ? '' : 's'}`} sub="Practice daily to grow it" tone="text-[#067647]" />
        <Stat label="Attempts" value={`${attempts.length}`} sub="All time" />
        <Stat label="Accuracy" value={`${accuracy}%`} sub="Correct / attempts" tone="text-brand-dark" />
      </div>

      <Card title="Problem sets">
        <div className="divide-y divide-line">
          {topics.map((t) => {
            const qs = bank[t].questions
            const solved = qs.filter((q) => solvedIds.has(q.id)).length
            const pct = Math.round((solved / qs.length) * 100)
            return (
              <div key={t} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-ink sm:w-[180px] sm:flex-none">{t}<span className="block text-[11px] font-normal text-ink-mute sm:hidden">{bank[t].level}</span></span>
                <span className="hidden w-[110px] text-[11.5px] text-ink-mute sm:inline">{bank[t].level}</span>
                <span className="order-last h-[7px] w-full overflow-hidden rounded-full bg-[#eef0f3] sm:order-none sm:w-auto sm:flex-1">
                  <span className="block h-full w-full origin-left rounded-full bg-brand transition-transform duration-300 ease-out" style={{ transform: `scaleX(${Math.max(0, Math.min(100, pct)) / 100})` }} />
                </span>
                <span className="w-[70px] text-right text-[11.5px] font-semibold text-ink-soft">{solved}/{qs.length}</span>
                <button onClick={() => start(t)} className="rounded-md border border-line px-3 py-1.5 text-[11.5px] font-medium text-ink-soft hover:bg-[#f7f8fa]">Practice</button>
              </div>
            )
          })}
        </div>
      </Card>

      <div id="practice-question">
        <Card
          title={topic ? `Practice · ${topic}` : 'Question of the day'}
          action={picked !== null && topic ? <button onClick={() => start(topic)} className="text-[11.5px] font-medium text-brand-dark hover:underline">Next question →</button> : undefined}
        >
          <p className="text-[12.5px] text-ink-soft">{current.q}</p>
          <div className="mt-3 space-y-2">
            {current.options.map((o, i) => {
              const state = picked === null ? '' : i === current.answer ? 'border-[#c9f0d9] bg-[#ecfdf3] text-[#067647]' : picked === i ? 'border-[#fbd5d1] bg-[#fef3f2] text-[#d92d20]' : ''
              return (
                <button key={o} onClick={() => pick(i)} className={`block w-full rounded-[9px] border px-3 py-2 text-left text-[12.5px] transition ${state || 'border-line text-ink-soft hover:bg-[#f7f8fa]'}`}>
                  {o}
                </button>
              )
            })}
          </div>
          {picked !== null && (
            <p className="mt-3 text-[12px] font-medium text-ink-mute">
              {picked === current.answer ? 'Correct — ' : 'Not quite. '}
              {current.why}
            </p>
          )}
        </Card>
      </div>
    </Page>
  )
}
