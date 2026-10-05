/**
 * PlacementIQ pricing and unit economics: one source of truth for the landing page, the plan defaults
 * the platform admin applies to a college, and the profit estimate on the Organizations page.
 *
 * Price = yearly platform fee per college + price per student seat per year (GST extra).
 * The only cost that grows with how much students use the product is AI, so every plan caps AI actions
 * per student per month (enforced in the database by public.consume_ai). That cap is what guarantees the margin.
 */

export type PlanKey = 'trial' | 'basic' | 'pro' | 'enterprise'

export type Plan = {
  key: PlanKey
  name: string
  pricePerSeat: number // ₹ per student per year
  platformFee: number // ₹ per college per year
  aiPerMonth: number // AI actions per student per month (assistant replies, resume analyses, JD matches)
  seats: string
  blurb: string
  features: string[]
  featured?: boolean
}

export const PLANS: Record<PlanKey, Plan> = {
  trial: {
    key: 'trial', name: 'Trial', pricePerSeat: 0, platformFee: 0, aiPerMonth: 15, seats: 'Up to 150 students, 30 days',
    blurb: 'Run one batch on PlacementIQ before you commit.',
    features: ['Every student feature', 'Placement cell login', 'Roster, classes and sections', '15 AI actions per student / month'],
  },
  basic: {
    key: 'basic', name: 'Basic', pricePerSeat: 449, platformFee: 60000, aiPerMonth: 40, seats: 'From 500 students',
    blurb: 'For a college running its placement season on PlacementIQ.',
    features: ['Eligibility engine and resume analyzer', 'AI career assistant and JD matching', 'GitHub, LeetCode, Codeforces, CodeChef sync', 'Campus drives, applications and rankings', 'Year, branch and section monitoring', '40 AI actions per student / month'],
  },
  pro: {
    key: 'pro', name: 'Pro', pricePerSeat: 749, platformFee: 60000, aiPerMonth: 80, seats: 'From 500 students', featured: true,
    blurb: 'For placement cells that run every drive and every class through one place.',
    features: ['Everything in Basic', 'Twice the AI: 80 actions per student / month', 'Priority onboarding and support', 'Placement-season review with your team'],
  },
  enterprise: {
    key: 'enterprise', name: 'Enterprise', pricePerSeat: 999, platformFee: 60000, aiPerMonth: 150, seats: 'From 3,000 students',
    blurb: 'For universities with several campuses or very large batches.',
    features: ['Everything in Pro', '150 AI actions per student / month', 'Multiple placement cell logins', 'Custom AI limits and seat counts', 'Dedicated onboarding'],
  },
}

/** Cost assumptions (₹). Sources: Groq gpt-oss-120b $0.15 / $0.60 per 1M tokens; AWS ap-south-1 list prices; ₹88 per US$. */
export const COSTS = {
  usdInr: 88,
  /** One AI action ≈ 5,000 input + 1,500 output tokens, plus 25% for retries and fallback models. */
  aiActionInr: ((5000 * 0.15 + 1500 * 0.6) / 1e6) * 88 * 1.25,
  /** Monthly infrastructure for the whole platform. Lean = Supabase Pro + Vercel today; AWS = production stack in Mumbai. */
  infraMonthlyInr: { lean: 5300, aws: 19700 },
  supportPerCollegeYear: 30000,
  storageEmailPerStudentYear: 2,
  paymentPct: 0.02,
  salesPct: 0.1,
  /** Share of the AI cap a typical student actually uses. */
  typicalAiUse: 0.35,
}

export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

export type Economics = {
  revenue: number
  ai: number
  aiWorst: number
  infra: number
  support: number
  variable: number
  cost: number
  costWorst: number
  profit: number
  margin: number
  marginWorst: number
}

/**
 * Yearly economics for one college.
 * `aiActionsPerYear` is the projected real usage (pass null to use the typical share of the cap).
 */
export function collegeEconomics(o: {
  seats: number
  pricePerSeat: number
  platformFee: number
  aiPerMonth: number
  aiActionsPerYear?: number | null
  colleges: number
  infraMonthly: number
  /** Months the college is served this year (a trial runs one month). */
  months?: number
}): Economics {
  const share = (o.months ?? 12) / 12
  const revenue = o.seats * o.pricePerSeat + o.platformFee
  const aiWorst = o.seats * o.aiPerMonth * 12 * (o.months ?? 12) / 12 * COSTS.aiActionInr
  const ai = o.aiActionsPerYear != null ? o.aiActionsPerYear * COSTS.aiActionInr : aiWorst * COSTS.typicalAiUse
  const infra = ((o.infraMonthly * 12) / Math.max(1, o.colleges)) * share
  const support = COSTS.supportPerCollegeYear * share
  const variable = revenue * (COSTS.paymentPct + COSTS.salesPct) + o.seats * COSTS.storageEmailPerStudentYear
  const cost = ai + infra + support + variable
  const costWorst = aiWorst + infra + support + variable
  const pct = (p: number) => (revenue > 0 ? (p / revenue) * 100 : 0)
  return { revenue, ai, aiWorst, infra, support, variable, cost, costWorst, profit: revenue - cost, margin: pct(revenue - cost), marginWorst: pct(revenue - costWorst) }
}
