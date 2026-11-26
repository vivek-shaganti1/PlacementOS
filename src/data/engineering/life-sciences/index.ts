import type { FamilyNode } from '../types'
import { BIOTECH } from './branches/biotech'
import { BME } from './branches/bme'
import { BIOTECH_TRACK } from './tracks/biotech'

/** Life sciences: its branches, the tracks it is the home of, and the tracks a student of it starts on before choosing. */
export const LIFESCI_FAMILY: FamilyNode = {
  id: 'lifesci',
  label: 'Life sciences',
  defaultTracks: ['biotech'],
  branches: [BIOTECH, BME],
  tracks: [BIOTECH_TRACK],
}
