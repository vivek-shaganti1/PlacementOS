import type { SkillRule } from '../types'

/** Chemical and process. Names are stable: they are stored in user_skills and in drives' skill requirements. */
export const CHEMICAL_SKILLS: SkillRule[] = [
  { name: 'Chemical Thermodynamics & Transport', short: 'Transport', keywords: ['mass transfer', 'heat transfer', 'chemical thermodynamics', 'fluid mechanics', 'distillation'], nptel: ['CH'], gate: ['CH'] },
  { name: 'Reaction Engineering', short: 'Reactions', keywords: ['reaction engineering', 'reactor', 'kinetics', 'catalysis'], nptel: ['CH'], gate: ['CH'] },
  { name: 'Process Simulation (Aspen / DWSIM)', short: 'Simulation', files: ['aspen', 'dwsim'], keywords: ['aspen plus', 'aspen hysys', 'dwsim', 'chemcad', 'process simulation'], badges: ['aspen', 'process simulation'], nptel: ['CH'] },
  { name: 'Process Control & Safety', short: 'Process Ctrl', langs: ['MATLAB'], files: ['simulink'], keywords: ['process control', 'hazop', 'process safety', 'p&id'], badges: ['process safety', 'hazop'], nptel: ['CH'], gate: ['CH'] },
]
