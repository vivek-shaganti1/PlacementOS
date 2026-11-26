import type { TrackNode } from '../../types'

/** Career track: Robotics. Roles are the jobs graduates of this track are usually hired into. */
export const ROBOTICS_TRACK: TrackNode = {
  id: 'robotics', label: 'Robotics', families: ['mechatronics', 'mechanical', 'electronics', 'electrical'], blurb: 'Robotics, automation and autonomous systems.', skills: ['Robotics & ROS', 'Control Systems', 'Embedded C', 'CAD Modelling', 'Aptitude & Reasoning'], resumeKeywords: ['ros', 'robot', 'kinematics', 'gazebo', 'control', 'embedded', 'python', 'c++', 'slam', 'automation'], categories: ['automation', 'automotive', 'embedded'],
  roles: [
    { id: 'robotics', title: 'Robotics Engineer', skills: ['Robotics & ROS', 'Control Systems', 'Embedded C'] },
    { id: 'automation_robotics', title: 'Automation Engineer', skills: ['Robotics & ROS', 'Control Systems', 'CAD Modelling'] },
  ],
}
