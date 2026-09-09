export type Bucket = 'eligible' | 'nearly' | 'canBecome' | 'notEligible'

export type Alumnus = {
  name: string
  title: string
  batch: string
  years: string
  location: string
  avatar: string
}

export type Company = {
  id: string
  name: string
  role: string
  match: number
  bucket: Bucket
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
  breakdown: { academic: number; skills: number; experience: number; projects: number }
  criteria: { label: string; required: string; yours: string; met: boolean }[]
  process: { stage: string; detail: string; duration: string }[]
  stats: { label: string; value: string }[]
  alumni: Alumnus[]
}
