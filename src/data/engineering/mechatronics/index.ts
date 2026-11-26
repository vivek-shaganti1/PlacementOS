import type { FamilyNode } from '../types'
import { MECHATRONICS } from './branches/mechatronics'
import { ROBOTICS } from './branches/robotics'
import { ROBOTICS_TRACK } from './tracks/robotics'

/** Mechatronics & robotics: its branches, the tracks it is the home of, and the tracks a student of it starts on before choosing. */
export const MECHATRONICS_FAMILY: FamilyNode = {
  id: 'mechatronics',
  label: 'Mechatronics & robotics',
  defaultTracks: ['robotics'],
  branches: [MECHATRONICS, ROBOTICS],
  tracks: [ROBOTICS_TRACK],
}
