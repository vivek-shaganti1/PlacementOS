import type { Branch } from '../../types'

/** Electronics & Instrumentation. */
export const EIE: Branch = { code: 'EIE', name: 'Electronics & Instrumentation', family: 'electronics', re: /\b(eie|e ?& ?i|electronics( and| &)? instrumentation|instrumentation)\b/i, tracks: ['automation', 'embedded'] }
