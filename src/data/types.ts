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
   * this kind of company) with no source behind them; shown with that warning. 'drive': a drive the college posted, the real data.
   */
  provenance: 'typical' | 'drive'
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
