import type { TrackNode } from '../../types'

/** Career track: Embedded systems and IoT. Roles are the jobs graduates of this track are usually hired into. */
export const EMBEDDED_TRACK: TrackNode = {
  id: 'embedded', label: 'Embedded systems and IoT', families: ['electronics', 'electrical', 'mechatronics', 'computing'], blurb: 'Firmware, IoT devices and automotive electronics.', skills: ['Embedded C', 'Microcontrollers & Protocols', 'PCB Design', 'RTOS & Embedded Linux', 'Digital Design', 'Aptitude & Reasoning'], resumeKeywords: ['embedded c', 'firmware', 'stm32', 'esp32', 'arduino', 'uart', 'spi', 'i2c', 'rtos', 'pcb'], categories: ['embedded', 'semiconductor'],
  roles: [
    { id: 'embedded_sw', title: 'Embedded Software Engineer', skills: ['Embedded C', 'Microcontrollers & Protocols', 'RTOS & Embedded Linux'] },
    { id: 'firmware', title: 'Firmware Engineer', skills: ['Embedded C', 'Microcontrollers & Protocols', 'Digital Design'] },
    { id: 'hardware', title: 'Hardware / PCB Design Engineer', skills: ['PCB Design', 'Microcontrollers & Protocols', 'Digital Design'] },
    { id: 'iot', title: 'IoT Engineer', skills: ['Microcontrollers & Protocols', 'Embedded C', 'RTOS & Embedded Linux'] },
  ],
}
