import { useMemo, useState } from 'react'
import { Card, Page, Stat } from '../components/Page'
import { useApp } from '../lib/store'

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
  'Aptitude & Logical': {
    level: 'Easy',
    questions: [
      { id: 'apt-1', q: 'A train 120 m long passes a pole in 6 s. Its speed is…', options: ['60 km/h', '72 km/h', '80 km/h', '20 km/h'], answer: 1, why: '120/6 = 20 m/s = 72 km/h.' },
      { id: 'apt-2', q: 'Next in the series 2, 6, 12, 20, 30, …?', options: ['40', '42', '44', '36'], answer: 1, why: 'Differences grow by 2: +12 gives 42 (n(n+1)).' },
    ],
  },
}

const topics = Object.keys(bank)
const allQs = topics.flatMap((t) => bank[t].questions)
const dayIndex = Math.floor(Date.now() / 86400000) % allQs.length

export default function Practice() {
  const { attempts, recordAttempt } = useApp()
  const [topic, setTopic] = useState<string | null>(null)
  const [current, setCurrent] = useState<Q>(allQs[dayIndex])
  const [picked, setPicked] = useState<number | null>(null)

  const solvedIds = useMemo(() => new Set(attempts.filter((a) => a.correct).map((a) => a.question_id)), [attempts])
  const accuracy = attempts.length ? Math.round((attempts.filter((a) => a.correct).length / attempts.length) * 100) : 0
  const streak = useMemo(() => {
    const days = new Set(attempts.map((a) => a.created_at.slice(0, 10)))
    let n = 0
    const d = new Date()
    if (!days.has(d.toISOString().slice(0, 10))) d.setUTCDate(d.getUTCDate() - 1)
    while (days.has(d.toISOString().slice(0, 10))) {
      n++
      d.setUTCDate(d.getUTCDate() - 1)
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
        <Stat label="Current streak" value={`${streak} day${streak === 1 ? '' : 's'}`} sub="Practice daily to grow it" tone="text-[#0A6B50]" />
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
                <span className="order-last h-[7px] w-full overflow-hidden rounded-[2px] bg-[#E6E1D6] sm:order-none sm:w-auto sm:flex-1">
                  <span className="block h-full rounded-[2px] bg-brand" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-[70px] text-right text-[11.5px] font-semibold text-ink-soft">{solved}/{qs.length}</span>
                <button onClick={() => start(t)} className="rounded-md border border-line px-3 py-1.5 text-[11.5px] font-medium text-ink-soft hover:bg-[#F0EDE5]">Practice</button>
              </div>
            )
          })}
        </div>
      </Card>

      <div id="practice-question">
        <Card
          title={topic ? `Practice · ${topic}` : 'Question of the day'}
          action={picked !== null && topic ? <button onClick={() => start(topic)} className="text-[11.5px] font-medium text-brand-dark hover:underline">Next question</button> : undefined}
        >
          <p className="text-[12.5px] text-ink-soft">{current.q}</p>
          <div className="mt-3 space-y-2">
            {current.options.map((o, i) => {
              const state = picked === null ? '' : i === current.answer ? 'border-[#C8C0B0] bg-[#F0EDE5] text-[#0A6B50]' : picked === i ? 'border-[#C8C0B0] bg-[#F0EDE5] text-[#9C3526]' : ''
              return (
                <button key={o} onClick={() => pick(i)} className={`block w-full rounded-[3px] border px-3 py-2 text-left text-[12.5px] ${state || 'border-line text-ink-soft hover:bg-[#F0EDE5]'}`}>
                  {o}
                </button>
              )
            })}
          </div>
          {picked !== null && (
            <p className="mt-3 text-[12px] font-medium text-ink-mute">
              {picked === current.answer ? 'Correct. ' : 'Not quite. '}
              {current.why}
            </p>
          )}
        </Card>
      </div>
    </Page>
  )
}
