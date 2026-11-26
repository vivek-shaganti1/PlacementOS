import type { SkillRule } from '../types'

/** Electrical. Names are stable: they are stored in user_skills and in drives' skill requirements. */
export const ELECTRICAL_SKILLS: SkillRule[] = [
  { name: 'Electrical Machines', short: 'Machines', langs: ['MATLAB'], files: ['simulink'], keywords: ['induction motor', 'transformer', 'dc machine', 'synchronous', 'electrical machines'], badges: ['electrical machines', 'motor'], nptel: ['EE'], gate: ['EE'] },
  { name: 'Power Systems', short: 'Power', langs: ['MATLAB'], files: ['simulink'], keywords: ['power system', 'load flow', 'protection', 'substation', 'etap', 'pscad', 'grid'], badges: ['power system', 'etap', 'smart grid'], nptel: ['EE'], gate: ['EE'] },
  { name: 'Power Electronics', short: 'Power Elec', langs: ['MATLAB'], files: ['simulink', 'spice'], keywords: ['inverter', 'converter', 'pwm', 'power electronics', 'mosfet', 'igbt'], badges: ['power electronics'], nptel: ['EE'], gate: ['EE'] },
  { name: 'Control Systems', short: 'Control', langs: ['MATLAB'], files: ['simulink'], keywords: ['pid', 'control system', 'transfer function', 'state space', 'bode'], badges: ['control system', 'matlab', 'simulink'], nptel: ['EE', 'ME', 'CH'], gate: ['EE', 'IN', 'EC'] },
  { name: 'MATLAB / Simulink', short: 'MATLAB', langs: ['MATLAB'], files: ['simulink'], keywords: ['matlab', 'simulink'], badges: ['matlab', 'simulink', 'mathworks'] },
  { name: 'PLC & Industrial Automation', short: 'PLC', files: ['plc'], keywords: ['plc', 'scada', 'hmi', 'ladder logic', 'dcs', 'industrial automation'], badges: ['plc', 'scada', 'automation', 'siemens', 'rockwell', 'labview'], nptel: ['EE', 'ME'], gate: ['IN'] },
  { name: 'Instrumentation & Sensors', short: 'Instrumentation', langs: ['LabVIEW'], files: ['arduino', 'pcb'], keywords: ['sensor', 'transducer', 'instrumentation', 'labview', 'daq'], badges: ['labview', 'instrumentation', 'national instruments'], nptel: ['EE'], gate: ['IN', 'EE'] },
  { name: 'Battery & EV Systems', short: 'EV', langs: ['MATLAB'], files: ['simulink'], keywords: ['battery management', 'bms', 'electric vehicle', 'lithium', 'charging', 'motor drive'], badges: ['electric vehicle', 'battery', 'ev'], nptel: ['EE', 'ME'] },
]
