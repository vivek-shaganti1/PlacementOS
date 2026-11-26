import type { Branch } from '../../types'

/** CSE (IoT). */
export const CSE_IOT: Branch = { code: 'CSE-IOT', name: 'CSE (IoT)', family: 'computing', re: /\b(cse ?\(?iot\)?|internet of things)\b/i, tracks: ['embedded', 'software'] }
