import type { TrackNode } from '../../types'

/** Career track: Process and chemical. Roles are the jobs graduates of this track are usually hired into. */
export const PROCESS_TRACK: TrackNode = {
  id: 'process', label: 'Process and chemical', families: ['chemical', 'lifesci'], blurb: 'Refineries, chemicals, pharma and FMCG process roles.', skills: ['Chemical Thermodynamics & Transport', 'Reaction Engineering', 'Process Simulation (Aspen / DWSIM)', 'Process Control & Safety', 'Aptitude & Reasoning'], resumeKeywords: ['process', 'aspen', 'hysys', 'distillation', 'reactor', 'heat exchanger', 'hazop', 'plant', 'p&id', 'mass transfer'], categories: ['process', 'energy'],
  roles: [
    { id: 'process', title: 'Process Engineer', skills: ['Chemical Thermodynamics & Transport', 'Reaction Engineering', 'Process Simulation (Aspen / DWSIM)'] },
    { id: 'plant', title: 'Production / Plant Engineer', skills: ['Process Control & Safety', 'Chemical Thermodynamics & Transport'] },
    { id: 'safety', title: 'Process Safety Engineer', skills: ['Process Control & Safety', 'Reaction Engineering'] },
  ],
}
