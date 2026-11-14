// The logic the app shares with the website, imported from the web source so there is one copy of every rule.
// Only add files here that are pure: no DOM, no browser storage, no `import.meta`, no web Supabase client.
// `npm run check:shared` (repo root, also run in CI) fails if one of these files stops being pure.
export { evaluateAll, evaluateJob, readinessOf, type JobPosting, type StudentLike } from '@shared/lib/eligibility'
export { predictSalary, interviewReadiness } from '@shared/lib/predict'
export { trustedProfile } from '@shared/lib/trust'
export { assembleProfile, RELATED, type RelatedRows } from '@shared/lib/profileShape'
export { istDay } from '@shared/lib/dates'
export type { Credential, Profile } from '@shared/lib/types'
export type { Bucket, Company } from '@shared/data/types'
