import type { FamilyNode } from '../types'
import { CIVIL } from './branches/civil'
import { STRUCTURAL_TRACK } from './tracks/structural'
import { CONSTRUCTION_TRACK } from './tracks/construction'

/** Civil: its branches, the tracks it is the home of, and the tracks a student of it starts on before choosing. */
export const CIVIL_FAMILY: FamilyNode = {
  id: 'civil',
  label: 'Civil',
  defaultTracks: ['structural'],
  branches: [CIVIL],
  tracks: [STRUCTURAL_TRACK, CONSTRUCTION_TRACK],
}
