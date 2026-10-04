export type Bucket = 'eligible' | 'nearly' | 'canBecome' | 'notEligible'

export type Alumnus = {
  name: string
  title: string
  batch: string
  years: string
  location: string
  avatar: string
}

export type Category = 'top' | 'quant' | 'ai' | 'product' | 'fintech' | 'startup' | 'infra' | 'hardware' | 'service' | 'consulting'

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
  alumni: Alumnus[]
}

export type Company = CompanyBase & {
  category: Category
  requirements: Requirements
  match: number
  bucket: Bucket
  breakdown: { academic: number; skills: number; experience: number; projects: number }
  criteria: Criterion[]
  gaps: { skill: string; have: number; need: number }[]
}
