import type { Branch } from '../../types'

/** AI & Data Science. */
export const AIDS: Branch = { code: 'AIDS', name: 'AI & Data Science', family: 'computing', re: /\b(ai ?& ?ds|aids|(ai|artificial intelligence)( and| &| ?& ?)? data science)\b/i, tracks: ['ai_data', 'software'] }
