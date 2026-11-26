import type { TrackNode } from '../../types'

/** Career track: VLSI and chip design. Roles are the jobs graduates of this track are usually hired into. */
export const VLSI_TRACK: TrackNode = {
  id: 'vlsi', label: 'VLSI and chip design', families: ['electronics', 'electrical'], blurb: 'RTL design, verification and physical design at semiconductor companies.', skills: ['Digital Design', 'Verilog / SystemVerilog', 'Verification & Timing (UVM/STA)', 'Analog & CMOS Circuits', 'Aptitude & Reasoning'], resumeKeywords: ['verilog', 'systemverilog', 'rtl', 'fpga', 'uvm', 'synthesis', 'timing', 'cmos', 'vivado', 'cadence'], categories: ['semiconductor', 'hardware'],
  roles: [
    { id: 'rtl', title: 'RTL Design Engineer', skills: ['Digital Design', 'Verilog / SystemVerilog'] },
    { id: 'dv', title: 'Design Verification Engineer', skills: ['Verification & Timing (UVM/STA)', 'Verilog / SystemVerilog', 'Digital Design'] },
    { id: 'pd', title: 'Physical Design Engineer', skills: ['Verification & Timing (UVM/STA)', 'Analog & CMOS Circuits', 'Digital Design'] },
    { id: 'analog', title: 'Analog / Mixed-signal Design Engineer', skills: ['Analog & CMOS Circuits', 'Digital Design'] },
  ],
}
