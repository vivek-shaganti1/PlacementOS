import type { FamilyNode } from '../types'
import { CSE_AIML } from './branches/cse-aiml'
import { AIDS } from './branches/aids'
import { DS } from './branches/ds'
import { CSE_CS } from './branches/cse-cs'
import { CSE_IOT } from './branches/cse-iot'
import { CSBS } from './branches/csbs'
import { AI } from './branches/ai'
import { CSE } from './branches/cse'
import { IT } from './branches/it'
import { SOFTWARE_TRACK } from './tracks/software'
import { AI_DATA_TRACK } from './tracks/ai-data'
import { CYBER_TRACK } from './tracks/cyber'

/** Computing: its branches, the tracks it is the home of, and the tracks a student of it starts on before choosing. */
export const COMPUTING_FAMILY: FamilyNode = {
  id: 'computing',
  label: 'Computing',
  defaultTracks: ['software'],
  branches: [CSE_AIML, AIDS, DS, CSE_CS, CSE_IOT, CSBS, AI, CSE, IT],
  tracks: [SOFTWARE_TRACK, AI_DATA_TRACK, CYBER_TRACK],
}
