import type { FamilyNode } from '../types'
import { AUTO } from './branches/auto'
import { AERO } from './branches/aero'
import { PROD } from './branches/prod'
import { MARINE } from './branches/marine'
import { MECH } from './branches/mech'
import { MECH_DESIGN_TRACK } from './tracks/mech-design'
import { MANUFACTURING_TRACK } from './tracks/manufacturing'
import { AUTOMOTIVE_TRACK } from './tracks/automotive'

/** Mechanical: its branches, the tracks it is the home of, and the tracks a student of it starts on before choosing. */
export const MECHANICAL_FAMILY: FamilyNode = {
  id: 'mechanical',
  label: 'Mechanical',
  defaultTracks: ['mech_design'],
  branches: [AUTO, AERO, PROD, MARINE, MECH],
  tracks: [MECH_DESIGN_TRACK, MANUFACTURING_TRACK, AUTOMOTIVE_TRACK],
}
