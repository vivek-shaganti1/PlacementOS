import type { TrackNode } from '../../types'

/** Career track: Industrial automation. Roles are the jobs graduates of this track are usually hired into. */
export const AUTOMATION_TRACK: TrackNode = {
  id: 'automation', label: 'Industrial automation', families: ['electrical', 'electronics', 'mechatronics', 'mechanical'], blurb: 'PLC, SCADA, drives and instrumentation in plants and factories.', skills: ['PLC & Industrial Automation', 'Control Systems', 'Instrumentation & Sensors', 'Electrical Machines', 'Aptitude & Reasoning'], resumeKeywords: ['plc', 'scada', 'hmi', 'ladder', 'drives', 'sensors', 'instrumentation', 'control', 'automation', 'labview'], categories: ['electrical', 'automation'],
  roles: [
    { id: 'plc', title: 'Automation / PLC Engineer', skills: ['PLC & Industrial Automation', 'Control Systems'] },
    { id: 'instrumentation', title: 'Instrumentation Engineer', skills: ['Instrumentation & Sensors', 'Control Systems'] },
    { id: 'controls', title: 'Controls Engineer', skills: ['Control Systems', 'PLC & Industrial Automation', 'Electrical Machines'] },
  ],
}
