export type Bucket = 'eligible' | 'nearly' | 'canBecome' | 'notEligible'

export type Category =
  | 'top' | 'quant' | 'ai' | 'product' | 'fintech' | 'startup' | 'infra' | 'hardware' | 'service' | 'consulting'
  // core (non-software) recruiters
  | 'semiconductor' | 'embedded' | 'telecom' | 'electrical' | 'energy' | 'automation' | 'automotive' | 'manufacturing'
  | 'engineering_services' | 'construction' | 'process' | 'biotech' | 'security'

export type Requirements = {
  minCgpa: number
  maxBacklogs: number
  minClassX: number
  minClassXII: number
  minInternships: number
  minProjects: number
  skills: Record<string, number>
}

export type Criterion = { label: string; required: string; yours: string; met: boolean }

export type CompanyBase = {
  id: string
  name: string
  role: string
  brand: string
  ctcAvg: number
  ctcMin: number
  ctcMax: number
  location: string
  jobType: string
  tenure: string
  batches: string
  about: string
  careers: string
  process: { stage: string; detail: string; duration: string }[]
  stats: { label: string; value: string }[]
  /**
   * Where the details come from. 'typical': hand-entered typical figures (fresher CTC range, a process template for
   * this kind of company) with no source behind them; shown with that warning. 'verified': a platform admin checked the
   * details against a source (public.company_catalog). 'drive': a drive the college posted, the real data.
   */
  provenance: 'typical' | 'verified' | 'drive'
  /** Where verified details came from, and the day someone last checked them (YYYY-MM-DD). */
  sourceUrl?: string
  lastChecked?: string
  /** The CTC range itself was checked against the source (a verified company may have only its description checked). */
  ctcVerified?: boolean
  /** The company has a public job board the app can list open roles from (/api/openings). */
  jobBoard?: boolean
}

/** A row of public.company_catalog: verified details that replace a built-in company's typical ones. */
export type CatalogOverride = {
  id: string
  name: string
  about: string
  careers_url: string
  ctc_min: number | string | null
  ctc_max: number | string | null
  ats: 'greenhouse' | 'lever' | 'ashby' | null
  ats_board: string | null
  source_url: string
  last_checked: string | null
  updated_at?: string
}

export type Company = CompanyBase & {
  category: Category
  requirements: Requirements
  match: number
  bucket: Bucket
  breakdown: { academic: number; skills: number; experience: number; projects: number }
  criteria: Criterion[]
  gaps: { skill: string; have: number; need: number }[]
  /** Set when the student was scored on their own track's skills at this company (the track's label, for example "Electric vehicles"). */
  scoredFor?: string
}
