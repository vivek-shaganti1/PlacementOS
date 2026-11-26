import type { FileSignal } from './types'

/**
 * Objective evidence the tree refers to: file types in GitHub repositories that identify real design work, paths that
 * never count, and GATE papers. Detected from the repository file tree, never self-declared.
 */
/** Path patterns that identify real design work. Detected from the repository file tree, never self-declared. */
export const FILE_SIGNALS: Record<FileSignal, { label: string; re: RegExp }> = {
  hdl: { label: 'Verilog / SystemVerilog / VHDL sources', re: /\.(v|sv|svh|vhd|vhdl)$/i },
  testbench: { label: 'HDL testbenches', re: /(^|\/)(tb_[^/]+|[^/]+_tb|[^/]*testbench[^/]*)\.(v|sv|vhd|vhdl)$/i },
  fpga: { label: 'FPGA constraint files', re: /\.(xdc|qsf|ucf|pcf|lpf|sdc)$/i },
  pcb: { label: 'PCB / schematic designs (KiCad, Eagle)', re: /\.(kicad_sch|kicad_pcb|brd)$/i },
  arduino: { label: 'Arduino sketches', re: /\.ino$/i },
  platformio: { label: 'PlatformIO firmware projects', re: /(^|\/)platformio\.ini$/i },
  stm32: { label: 'STM32CubeMX projects', re: /\.ioc$/i },
  spice: { label: 'SPICE circuit simulations', re: /\.(cir|asc|spice)$/i },
  simulink: { label: 'Simulink models', re: /\.(slx|mdl)$/i },
  plc: { label: 'PLC programs', re: /\.(l5x|l5k|ap1\d|zap1\d|smc|tsproj)$/i },
  cad3d: { label: '3D CAD models', re: /\.(step|stp|iges|igs|sldprt|sldasm|f3d|ipt|iam|catpart|catproduct|x_t|3mf|stl)$/i },
  cad2d: { label: 'AutoCAD drawings', re: /\.(dwg|dxf)$/i },
  staad: { label: 'STAAD.Pro models', re: /\.std$/i },
  etabs: { label: 'ETABS models', re: /\.(edb|e2k)$/i },
  bim: { label: 'Revit / BIM models', re: /\.(rvt|rfa|ifc)$/i },
  notebook: { label: 'Jupyter notebooks', re: /\.ipynb$/i },
  ros: { label: 'ROS packages and robot descriptions', re: /\.(urdf|xacro|launch)$|(^|\/)package\.xml$/i },
  aspen: { label: 'Aspen process models', re: /\.(bkp|apw|hsc)$/i },
  dwsim: { label: 'DWSIM process models', re: /\.dwxmz?$/i },
}

/** Paths that never count (vendored code, generated output, example libraries). */
export const IGNORED_PATH = /(^|\/)(node_modules|vendor|third_party|\.git|build|dist|examples?|docs?)\//i

/** GATE paper codes and their family. */
export const GATE_PAPERS: Record<string, string> = {
  CS: 'Computer Science & IT', DA: 'Data Science & AI', EC: 'Electronics & Communication', EE: 'Electrical', IN: 'Instrumentation',
  ME: 'Mechanical', PI: 'Production & Industrial', AE: 'Aerospace', CE: 'Civil', CH: 'Chemical', BT: 'Biotechnology', MT: 'Metallurgy',
  MN: 'Mining', XE: 'Engineering Sciences', XL: 'Life Sciences', BM: 'Biomedical', TF: 'Textile', AG: 'Agricultural', PE: 'Petroleum',
}
