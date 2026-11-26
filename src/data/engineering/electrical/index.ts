import type { FamilyNode } from '../types'
import { EIN } from './branches/ein'
import { EEE } from './branches/eee'
import { EE } from './branches/ee'
import { POWER_TRACK } from './tracks/power'
import { AUTOMATION_TRACK } from './tracks/automation'
import { EV_TRACK } from './tracks/ev'

/** Electrical: its branches, the tracks it is the home of, and the tracks a student of it starts on before choosing. */
export const ELECTRICAL_FAMILY: FamilyNode = {
  id: 'electrical',
  label: 'Electrical',
  defaultTracks: ['power', 'software'],
  branches: [EIN, EEE, EE],
  tracks: [POWER_TRACK, AUTOMATION_TRACK, EV_TRACK],
}
