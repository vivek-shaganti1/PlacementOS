import type { Branch } from '../../types'

/** CSE (Cyber Security). */
export const CSE_CS: Branch = { code: 'CSE-CS', name: 'CSE (Cyber Security)', family: 'computing', re: /\b(cyber ?security|cse ?\(?cs\)?|cs ?& ?cs)\b/i, tracks: ['cyber', 'software'] }
