import type { FamilyNode } from '../types'
import { PETRO } from './branches/petro'
import { CHEM } from './branches/chem'
import { PROCESS_TRACK } from './tracks/process'

/** Chemical & process: its branches, the tracks it is the home of, and the tracks a student of it starts on before choosing. */
export const CHEMICAL_FAMILY: FamilyNode = {
  id: 'chemical',
  label: 'Chemical & process',
  defaultTracks: ['process'],
  branches: [PETRO, CHEM],
  tracks: [PROCESS_TRACK],
}
