import type { SkillRule } from '../types'

/** Life sciences. Names are stable: they are stored in user_skills and in drives' skill requirements. */
export const LIFE_SCIENCES_SKILLS: SkillRule[] = [
  { name: 'Molecular Biology & Lab Techniques', short: 'Lab', keywords: ['pcr', 'western blot', 'cell culture', 'elisa', 'gel electrophoresis'], nptel: ['BT'], gate: ['BT', 'XL'] },
  { name: 'Bioprocess Engineering', short: 'Bioprocess', keywords: ['bioprocess', 'fermentation', 'downstream processing', 'bioreactor'], nptel: ['BT', 'CH'], gate: ['BT'] },
  { name: 'Bioinformatics', short: 'Bioinfo', langs: ['Python', 'R', 'Jupyter Notebook'], files: ['notebook'], keywords: ['bioinformatics', 'genomics', 'sequence alignment', 'blast', 'biopython'], badges: ['bioinformatics', 'genomics'], nptel: ['BT'] },
]
