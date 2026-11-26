import type { SkillRule } from '../types'

/** Mechanical, automotive and robotics. Names are stable: they are stored in user_skills and in drives' skill requirements. */
export const MECHANICAL_SKILLS: SkillRule[] = [
  { name: 'CAD Modelling', short: 'CAD', files: ['cad3d'], keywords: ['solidworks', 'catia', 'creo', 'fusion 360', 'inventor', 'nx', '3d modelling'], badges: ['solidworks', 'catia', 'fusion 360', 'inventor', 'autodesk', 'creo', 'cad'], nptel: ['ME'] },
  { name: 'Engineering Drawing & GD&T', short: 'GD&T', files: ['cad2d', 'cad3d'], keywords: ['gd&t', 'engineering drawing', 'autocad', 'drafting', 'tolerancing'], badges: ['autocad', 'gd&t', 'drafting'], nptel: ['ME', 'CE'] },
  { name: 'Strength of Materials & Design', short: 'Design', langs: ['MATLAB'], keywords: ['strength of materials', 'machine design', 'stress analysis', 'fatigue'], nptel: ['ME', 'CE'], gate: ['ME', 'CE', 'PI'] },
  { name: 'FEA / CFD Simulation', short: 'Simulation', files: ['cad3d'], keywords: ['ansys', 'fea', 'cfd', 'abaqus', 'fluent', 'comsol', 'hypermesh'], badges: ['ansys', 'simulation', 'abaqus', 'comsol', 'hypermesh'], nptel: ['ME', 'AE', 'CH'] },
  { name: 'Thermodynamics & Fluids', short: 'Thermal', langs: ['MATLAB'], keywords: ['thermodynamics', 'heat transfer', 'fluid mechanics', 'refrigeration', 'hvac'], nptel: ['ME', 'CH', 'AE'], gate: ['ME', 'CH', 'AE', 'XE'] },
  { name: 'Manufacturing & Industrial Engineering', short: 'Manufacturing', files: ['cad3d'], keywords: ['manufacturing', 'cnc', 'lean', 'six sigma', 'kaizen', 'production', 'welding', 'casting', '3d printing'], badges: ['six sigma', 'lean', 'cnc', 'manufacturing', 'quality'], nptel: ['ME'], gate: ['ME', 'PI'] },
  { name: 'Automobile & Vehicle Systems', short: 'Automotive', files: ['cad3d', 'simulink'], keywords: ['automobile', 'baja', 'formula student', 'supra', 'vehicle dynamics', 'ic engine', 'powertrain'], badges: ['automotive', 'vehicle'], nptel: ['ME'], gate: ['ME'] },
  { name: 'Robotics & ROS', short: 'Robotics', langs: ['C++', 'Python'], files: ['ros'], keywords: ['ros', 'robotics', 'robot', 'gazebo', 'kinematics', 'slam'], badges: ['robotics', 'ros'], nptel: ['ME', 'EE'] },
]
