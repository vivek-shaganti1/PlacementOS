/**
 * The engineering tree, assembled: Engineering > family > branch, the career tracks (with their job roles) and every skill
 * with the evidence that proves it. Each node lives in its own file under this folder; README.md draws the tree.
 *
 * Order matters in two places, and both are kept here on purpose:
 * - BRANCHES: a branch name can match several patterns ("CSE (AI & ML)" is also "AI" and "CSE"), and the first match is
 *   the branch's own code, so specific branches come before general ones. ECM sits before CSE because "Electronics &
 *   Computer Engineering" also says "computer engineering".
 * - SKILL_RULES and TRACKS: the order users see them in, unchanged from before the tree was split into files.
 */
import type { Branch, Family, FamilyNode, Role, SkillRule, TrackNode } from './types'
import { COMPUTING_FAMILY } from './computing'
import { ELECTRONICS_FAMILY } from './electronics'
import { ELECTRICAL_FAMILY } from './electrical'
import { MECHANICAL_FAMILY } from './mechanical'
import { MECHATRONICS_FAMILY } from './mechatronics'
import { CIVIL_FAMILY } from './civil'
import { CHEMICAL_FAMILY } from './chemical'
import { LIFESCI_FAMILY } from './life-sciences'
import { MATERIALS_FAMILY } from './materials'
import { CSE_AIML } from './computing/branches/cse-aiml'
import { AIDS } from './computing/branches/aids'
import { DS } from './computing/branches/ds'
import { CSE_CS } from './computing/branches/cse-cs'
import { CSE_IOT } from './computing/branches/cse-iot'
import { CSBS } from './computing/branches/csbs'
import { AI } from './computing/branches/ai'
import { CSE } from './computing/branches/cse'
import { IT } from './computing/branches/it'
import { VLSI } from './electronics/branches/vlsi'
import { ECM } from './electronics/branches/ecm'
import { EIN } from './electrical/branches/ein'
import { EIE } from './electronics/branches/eie'
import { ETE } from './electronics/branches/ete'
import { ECE } from './electronics/branches/ece'
import { EEE } from './electrical/branches/eee'
import { EE } from './electrical/branches/ee'
import { MECHATRONICS } from './mechatronics/branches/mechatronics'
import { ROBOTICS } from './mechatronics/branches/robotics'
import { AUTO } from './mechanical/branches/auto'
import { AERO } from './mechanical/branches/aero'
import { PROD } from './mechanical/branches/prod'
import { MARINE } from './mechanical/branches/marine'
import { MECH } from './mechanical/branches/mech'
import { CIVIL } from './civil/branches/civil'
import { PETRO } from './chemical/branches/petro'
import { CHEM } from './chemical/branches/chem'
import { BIOTECH } from './life-sciences/branches/biotech'
import { BME } from './life-sciences/branches/bme'
import { META } from './materials/branches/meta'
import { MINING } from './materials/branches/mining'
import { TEXTILE } from './materials/branches/textile'
import { AGRI } from './materials/branches/agri'
import { SOFTWARE_TRACK } from './computing/tracks/software'
import { AI_DATA_TRACK } from './computing/tracks/ai-data'
import { CYBER_TRACK } from './computing/tracks/cyber'
import { VLSI_TRACK } from './electronics/tracks/vlsi'
import { EMBEDDED_TRACK } from './electronics/tracks/embedded'
import { COMMS_TRACK } from './electronics/tracks/comms'
import { POWER_TRACK } from './electrical/tracks/power'
import { AUTOMATION_TRACK } from './electrical/tracks/automation'
import { EV_TRACK } from './electrical/tracks/ev'
import { MECH_DESIGN_TRACK } from './mechanical/tracks/mech-design'
import { MANUFACTURING_TRACK } from './mechanical/tracks/manufacturing'
import { AUTOMOTIVE_TRACK } from './mechanical/tracks/automotive'
import { ROBOTICS_TRACK } from './mechatronics/tracks/robotics'
import { STRUCTURAL_TRACK } from './civil/tracks/structural'
import { CONSTRUCTION_TRACK } from './civil/tracks/construction'
import { PROCESS_TRACK } from './chemical/tracks/process'
import { BIOTECH_TRACK } from './life-sciences/tracks/biotech'
import { MATERIALS_TRACK } from './materials/tracks/materials'
import { SOFTWARE_SKILLS } from './skills/software'
import { AI_DATA_SKILLS } from './skills/ai-data'
import { SECURITY_SKILLS } from './skills/security'
import { ELECTRONICS_SKILLS } from './skills/electronics'
import { ELECTRICAL_SKILLS } from './skills/electrical'
import { MECHANICAL_SKILLS } from './skills/mechanical'
import { CIVIL_SKILLS } from './skills/civil'
import { CHEMICAL_SKILLS } from './skills/chemical'
import { LIFE_SCIENCES_SKILLS } from './skills/life-sciences'
import { MATERIALS_SKILLS } from './skills/materials'

export type { Branch, Family, FamilyNode, FileSignal, Role, SkillRule, Track, TrackNode } from './types'
export { FILE_SIGNALS, GATE_PAPERS, IGNORED_PATH } from './evidence'

export const FAMILIES: FamilyNode[] = [COMPUTING_FAMILY, ELECTRONICS_FAMILY, ELECTRICAL_FAMILY, MECHANICAL_FAMILY, MECHATRONICS_FAMILY, CIVIL_FAMILY, CHEMICAL_FAMILY, LIFESCI_FAMILY, MATERIALS_FAMILY]

export const BRANCHES: Branch[] = [CSE_AIML, AIDS, DS, CSE_CS, CSE_IOT, CSBS, AI, ECM, CSE, IT, VLSI, EIN, EIE, ETE, ECE, EEE, EE, MECHATRONICS, ROBOTICS, AUTO, AERO, PROD, MARINE, MECH, CIVIL, PETRO, CHEM, BIOTECH, BME, META, MINING, TEXTILE, AGRI]

export const TRACKS: TrackNode[] = [SOFTWARE_TRACK, AI_DATA_TRACK, CYBER_TRACK, VLSI_TRACK, EMBEDDED_TRACK, COMMS_TRACK, POWER_TRACK, AUTOMATION_TRACK, EV_TRACK, MECH_DESIGN_TRACK, MANUFACTURING_TRACK, AUTOMOTIVE_TRACK, ROBOTICS_TRACK, STRUCTURAL_TRACK, CONSTRUCTION_TRACK, PROCESS_TRACK, BIOTECH_TRACK, MATERIALS_TRACK]

/** Every skill any track uses. Names are stable: they are stored in user_skills and in drives' skill requirements. */
export const SKILL_RULES: SkillRule[] = [...SOFTWARE_SKILLS, ...AI_DATA_SKILLS, ...SECURITY_SKILLS, ...ELECTRONICS_SKILLS, ...ELECTRICAL_SKILLS, ...MECHANICAL_SKILLS, ...CIVIL_SKILLS, ...CHEMICAL_SKILLS, ...LIFE_SCIENCES_SKILLS, ...MATERIALS_SKILLS]

export const FAMILY_LABEL = Object.fromEntries(FAMILIES.map((f) => [f.id, f.label])) as Record<Family, string>
export const DEFAULT_TRACKS = Object.fromEntries(FAMILIES.map((f) => [f.id, f.defaultTracks])) as Record<Family, string[]>
export const DEFAULT_TRACK_FOR: Record<string, string[]> = Object.fromEntries(BRANCHES.filter((b) => b.tracks).map((b) => [b.code, b.tracks!]))

/** Every job role in every track, with the track it belongs to. */
export const ROLES: (Role & { track: string })[] = TRACKS.flatMap((t) => t.roles.map((r) => ({ ...r, track: t.id })))
