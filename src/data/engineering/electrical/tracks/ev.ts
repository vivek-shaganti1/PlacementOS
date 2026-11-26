import type { TrackNode } from '../../types'

/** Career track: Electric vehicles. Roles are the jobs graduates of this track are usually hired into. */
export const EV_TRACK: TrackNode = {
  id: 'ev', label: 'Electric vehicles', families: ['electrical', 'mechanical', 'mechatronics'], blurb: 'Batteries, motor drives and powertrain at EV and automotive companies.', skills: ['Battery & EV Systems', 'Power Electronics', 'Electrical Machines', 'MATLAB / Simulink', 'Aptitude & Reasoning'], resumeKeywords: ['battery', 'bms', 'electric vehicle', 'motor', 'inverter', 'matlab', 'simulink', 'charging', 'powertrain', 'thermal'], categories: ['automotive', 'electrical'],
  roles: [
    { id: 'bms', title: 'Battery / BMS Engineer', skills: ['Battery & EV Systems', 'Power Electronics', 'MATLAB / Simulink'] },
    { id: 'motor_drive', title: 'Motor Drive Engineer', skills: ['Electrical Machines', 'Power Electronics'] },
    { id: 'ev_systems', title: 'EV Systems Engineer', skills: ['Battery & EV Systems', 'Electrical Machines', 'MATLAB / Simulink'] },
  ],
}
