import type { FamilyNode } from '../types'
import { VLSI } from './branches/vlsi'
import { ECM } from './branches/ecm'
import { EIE } from './branches/eie'
import { ETE } from './branches/ete'
import { ECE } from './branches/ece'
import { VLSI_TRACK } from './tracks/vlsi'
import { EMBEDDED_TRACK } from './tracks/embedded'
import { COMMS_TRACK } from './tracks/comms'

/** Electronics: its branches, the tracks it is the home of, and the tracks a student of it starts on before choosing. */
export const ELECTRONICS_FAMILY: FamilyNode = {
  id: 'electronics',
  label: 'Electronics',
  defaultTracks: ['embedded', 'software'],
  branches: [VLSI, ECM, EIE, ETE, ECE],
  tracks: [VLSI_TRACK, EMBEDDED_TRACK, COMMS_TRACK],
}
