import type { Branch } from '../../types'

/** Production / Industrial. */
export const PROD: Branch = { code: 'PROD', name: 'Production / Industrial', family: 'mechanical', re: /\b(production|industrial engineering|manufacturing)\b/i, tracks: ['manufacturing'] }
