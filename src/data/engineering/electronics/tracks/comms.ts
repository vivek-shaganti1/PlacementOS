import type { TrackNode } from '../../types'

/** Career track: Communication and RF. Roles are the jobs graduates of this track are usually hired into. */
export const COMMS_TRACK: TrackNode = {
  id: 'comms', label: 'Communication and RF', families: ['electronics'], blurb: 'Telecom, wireless and signal processing roles.', skills: ['Signals & Systems', 'Communication Systems', 'Networking', 'MATLAB / Simulink', 'Aptitude & Reasoning'], resumeKeywords: ['signal processing', 'matlab', 'modulation', 'wireless', 'rf', 'antenna', '5g', 'dsp', 'simulink', 'lte'], categories: ['telecom', 'semiconductor'],
  roles: [
    { id: 'rf', title: 'RF / Wireless Engineer', skills: ['Communication Systems', 'Signals & Systems'] },
    { id: 'dsp', title: 'DSP Engineer', skills: ['Signals & Systems', 'MATLAB / Simulink'] },
    { id: 'telecom', title: 'Network / Telecom Engineer', skills: ['Networking', 'Communication Systems'] },
  ],
}
