import type { Branch } from '../../types'

/** CSE (AI & ML). */
export const CSE_AIML: Branch = { code: 'CSE-AIML', name: 'CSE (AI & ML)', family: 'computing', re: /\b(aiml|ai ?& ?ml|ai ?\/ ?ml|artificial intelligence( and| &)? machine learning)\b/i, tracks: ['ai_data', 'software'] }
