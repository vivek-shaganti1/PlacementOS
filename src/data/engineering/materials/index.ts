import type { FamilyNode } from '../types'
import { META } from './branches/meta'
import { MINING } from './branches/mining'
import { TEXTILE } from './branches/textile'
import { AGRI } from './branches/agri'
import { MATERIALS_TRACK } from './tracks/materials'

/** Materials, mining & others: its branches, the tracks it is the home of, and the tracks a student of it starts on before choosing. */
export const MATERIALS_FAMILY: FamilyNode = {
  id: 'materials',
  label: 'Materials, mining & others',
  defaultTracks: ['materials'],
  branches: [META, MINING, TEXTILE, AGRI],
  tracks: [MATERIALS_TRACK],
}
