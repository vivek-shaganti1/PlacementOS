import type { SkillRule } from '../types'

/** Electronics: VLSI, embedded, communication. Names are stable: they are stored in user_skills and in drives' skill requirements. */
export const ELECTRONICS_SKILLS: SkillRule[] = [
  { name: 'Digital Design', short: 'Digital', langs: ['Verilog', 'SystemVerilog', 'VHDL'], files: ['hdl', 'fpga'], keywords: ['digital design', 'fpga', 'flip-flop', 'fsm', 'combinational', 'sequential'], badges: ['fpga', 'digital design', 'vlsi'], nptel: ['EE', 'EC'], gate: ['EC', 'EE', 'IN'] },
  { name: 'Verilog / SystemVerilog', short: 'HDL', langs: ['Verilog', 'SystemVerilog', 'VHDL'], files: ['hdl', 'testbench'], keywords: ['verilog', 'systemverilog', 'vhdl', 'rtl', 'uvm', 'testbench'], badges: ['verilog', 'systemverilog', 'uvm', 'vlsi'], nptel: ['EE', 'EC'] },
  { name: 'Verification & Timing (UVM/STA)', short: 'Verification', langs: ['SystemVerilog'], files: ['testbench', 'fpga'], keywords: ['uvm', 'static timing', 'sta', 'verification', 'cocotb', 'synthesis'], badges: ['uvm', 'verification', 'cadence', 'synopsys'] },
  { name: 'Analog & CMOS Circuits', short: 'Analog', files: ['spice'], keywords: ['analog', 'cmos', 'op-amp', 'spice', 'ltspice', 'cadence virtuoso', 'layout'], badges: ['analog', 'cmos', 'circuit'], nptel: ['EE', 'EC'], gate: ['EC', 'EE', 'IN'] },
  { name: 'Embedded C', short: 'Embedded C', langs: ['C', 'C++', 'Assembly'], files: ['arduino', 'platformio', 'stm32'], keywords: ['embedded c', 'firmware', 'bare metal', 'interrupts', 'keil'], badges: ['embedded', 'arm', 'microcontroller'], nptel: ['EE', 'EC', 'CS'] },
  { name: 'Microcontrollers & Protocols', short: 'MCU', files: ['arduino', 'platformio', 'stm32', 'pcb'], keywords: ['stm32', 'esp32', 'arduino', 'avr', 'pic', 'uart', 'spi', 'i2c', 'can bus'], badges: ['arduino', 'arm', 'microcontroller', 'iot'], nptel: ['EE', 'EC'] },
  { name: 'PCB Design', short: 'PCB', files: ['pcb'], keywords: ['pcb', 'kicad', 'altium', 'eagle', 'schematic'], badges: ['pcb', 'altium', 'kicad'] },
  { name: 'RTOS & Embedded Linux', short: 'RTOS', langs: ['C', 'C++', 'Shell'], files: ['platformio', 'stm32'], keywords: ['freertos', 'rtos', 'zephyr', 'embedded linux', 'yocto', 'device driver'], badges: ['rtos', 'linux'] },
  { name: 'Signals & Systems', short: 'Signals', langs: ['MATLAB'], files: ['simulink', 'notebook'], keywords: ['signal processing', 'dsp', 'fourier', 'filter design', 'z-transform'], badges: ['signal processing', 'matlab'], nptel: ['EE', 'EC'], gate: ['EC', 'EE', 'IN'] },
  { name: 'Communication Systems', short: 'Comms', langs: ['MATLAB', 'Python'], files: ['simulink'], keywords: ['modulation', 'wireless', '5g', 'lte', 'antenna', 'rf', 'sdr', 'gnu radio'], badges: ['wireless', '5g', 'rf', 'telecom'], nptel: ['EE', 'EC'], gate: ['EC'] },
]
