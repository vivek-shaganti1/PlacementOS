import type { TrackNode } from '../../types'

/** Career track: Power and energy. Roles are the jobs graduates of this track are usually hired into. */
export const POWER_TRACK: TrackNode = {
  id: 'power', label: 'Power and energy', families: ['electrical'], blurb: 'Power utilities, transmission, renewables and electrical equipment makers.', skills: ['Power Systems', 'Electrical Machines', 'Power Electronics', 'Control Systems', 'MATLAB / Simulink', 'Aptitude & Reasoning'], resumeKeywords: ['power system', 'transformer', 'substation', 'protection', 'inverter', 'matlab', 'simulink', 'etap', 'solar', 'grid'], categories: ['electrical', 'energy'],
  roles: [
    { id: 'power_systems', title: 'Power Systems Engineer', skills: ['Power Systems', 'Electrical Machines'] },
    { id: 'electrical_design', title: 'Electrical Design Engineer', skills: ['Electrical Machines', 'Power Electronics', 'Control Systems'] },
    { id: 'power_electronics', title: 'Power Electronics Engineer', skills: ['Power Electronics', 'Control Systems', 'MATLAB / Simulink'] },
  ],
}
