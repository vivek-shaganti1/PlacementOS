import type { SkillRule } from '../types'

/** Materials, metallurgy and mining. Names are stable: they are stored in user_skills and in drives' skill requirements. */
export const MATERIALS_SKILLS: SkillRule[] = [
  { name: 'Materials & Metallurgy', short: 'Materials', keywords: ['metallurgy', 'heat treatment', 'phase diagram', 'materials characterization', 'xrd', 'sem'], nptel: ['MM', 'ME'], gate: ['MT'] },
]
