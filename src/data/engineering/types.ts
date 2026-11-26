/**
 * The shapes of the engineering tree: Engineering > family > branch, with career tracks (and the job roles inside them)
 * and the skills each track is measured on. Pure data: no DOM, no npm imports (the mobile app shares it).
 */

export type Family = 'computing' | 'electronics' | 'electrical' | 'mechanical' | 'mechatronics' | 'civil' | 'chemical' | 'lifesci' | 'materials'

/** File signals detected in a student's GitHub repositories (see FILE_SIGNALS). */
export type FileSignal =
  | 'hdl' | 'testbench' | 'fpga' | 'pcb' | 'arduino' | 'platformio' | 'stm32' | 'spice' | 'simulink' | 'plc'
  | 'cad3d' | 'cad2d' | 'staad' | 'etabs' | 'bim' | 'notebook' | 'ros' | 'aspen' | 'dwsim'

export type SkillRule = {
  name: string
  short: string
  /** GitHub languages that count (by repositories using them). */
  langs?: string[]
  /** Design / project files that count. */
  files?: FileSignal[]
  /** Keywords matched against verified Credly badge names and issuers. */
  badges?: string[]
  /** NPTEL discipline codes whose certificates count (the code is part of the certificate ID). */
  nptel?: string[]
  /** Resume and repository-topic keywords (supporting evidence only). */
  keywords?: string[]
  /** Other automated sources. */
  huggingface?: boolean
  ctf?: boolean
  /** GATE paper codes whose confirmed score counts for this skill. */
  gate?: string[]
}

/** A job a graduate of a track is hired into. `skills` are the track's skills that role leans on most, most important first. */
export type Role = { id: string; title: string; skills: string[] }

/** `skills` order matters: the first two non-aptitude skills are the track's lead skills (see coreSkills in lib/predict). */
export type Track = { id: string; label: string; families: Family[]; blurb: string; skills: string[]; resumeKeywords: string[]; categories: string[] }

/** A track with the roles inside it. */
export type TrackNode = Track & { roles: Role[] }

/** A BTech branch as colleges spell it. `tracks` overrides the family's default tracks for this branch. */
export type Branch = { code: string; name: string; family: Family; re: RegExp; tracks?: string[] }

export type FamilyNode = { id: Family; label: string; defaultTracks: string[]; branches: Branch[]; tracks: TrackNode[] }
