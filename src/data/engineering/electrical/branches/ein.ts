import type { Branch } from '../../types'

/** Electrical & Instrumentation. */
export const EIN: Branch = { code: 'EIN', name: 'Electrical & Instrumentation', family: 'electrical', re: /\b(electrical( and| &)? instrumentation)\b/i }
