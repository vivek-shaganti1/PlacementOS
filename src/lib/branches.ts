/**
 * Every BTech branch, grouped into families recruiters evaluate the same way, and the career tracks inside each family.
 * A track lists the skills a recruiter tests and, for each skill, the objective evidence that can prove it:
 * file types found in the student's GitHub repositories, GitHub languages, verified Credly badges, NPTEL certificates
 * (by discipline code), Hugging Face, CTFtime and a placement-cell-confirmed GATE score. Self-rating is never evidence.
 *
 * Shared by the browser (onboarding, skill gap, what-if) and the server (/api/resume, /api/connect).
 */

export type Family = 'computing' | 'electronics' | 'electrical' | 'mechanical' | 'mechatronics' | 'civil' | 'chemical' | 'lifesci' | 'materials'

/** File signals detected in a student's GitHub repositories (see FILE_SIGNALS). */
export type FileSignal =
  | 'hdl' | 'testbench' | 'fpga' | 'pcb' | 'arduino' | 'platformio' | 'stm32' | 'spice' | 'simulink' | 'plc'
  | 'cad3d' | 'cad2d' | 'staad' | 'etabs' | 'bim' | 'notebook' | 'ros' | 'aspen' | 'dwsim'

export type SkillRule = {
  name: string
  short: string
  /** GitHub languages that count (by repositories using them). */
  langs?: string[]
  /** Design / project files that count. */
  files?: FileSignal[]
  /** Keywords matched against verified Credly badge names and issuers. */
  badges?: string[]
  /** NPTEL discipline codes whose certificates count (the code is part of the certificate ID). */
  nptel?: string[]
  /** Resume and repository-topic keywords (supporting evidence only). */
  keywords?: string[]
  /** Other automated sources. */
  huggingface?: boolean
  ctf?: boolean
  /** GATE paper codes whose confirmed score counts for this skill. */
  gate?: string[]
}

export type Track = { id: string; label: string; families: Family[]; blurb: string; skills: string[]; resumeKeywords: string[]; categories: string[] }

const APT: SkillRule = { name: 'Aptitude & Reasoning', short: 'Aptitude', keywords: ['aptitude', 'quantitative', 'reasoning'], gate: ['EC', 'EE', 'ME', 'CE', 'CH', 'IN', 'BT', 'MT', 'PI', 'AE', 'CS', 'DA'] }

/** Every skill any track uses. Names are stable: they are stored in user_skills and in drives' skill requirements. */
export const SKILL_RULES: SkillRule[] = [
  // ---- software (the original eight; unchanged so existing data keeps its meaning)
  { name: 'Data Structures & Algorithms', short: 'DSA', keywords: ['dsa', 'algorithms', 'leetcode', 'competitive programming'], nptel: ['CS'], gate: ['CS', 'DA'] },
  { name: 'System Design', short: 'System Design', keywords: ['system design', 'distributed', 'microservices', 'scalable', 'kafka'] },
  { name: 'React / Frontend', short: 'Frontend', langs: ['JavaScript', 'TypeScript', 'HTML', 'CSS', 'Vue', 'Svelte', 'Dart'], keywords: ['react', 'next.js', 'vue', 'angular', 'frontend', 'flutter'] },
  { name: 'Node.js / Backend', short: 'Backend', langs: ['Go', 'Java', 'Kotlin', 'Rust', 'PHP', 'Ruby', 'C#'], keywords: ['node', 'express', 'django', 'flask', 'fastapi', 'spring', 'backend', 'rest api'] },
  { name: 'Databases (SQL + NoSQL)', short: 'Databases', langs: ['PLpgSQL', 'TSQL', 'SQL'], keywords: ['sql', 'postgres', 'mysql', 'mongodb', 'database'], badges: ['database', 'sql', 'mongodb'], nptel: ['CS'] },
  { name: 'Machine Learning', short: 'ML', langs: ['Jupyter Notebook', 'R'], files: ['notebook'], keywords: ['machine learning', 'deep learning', 'pytorch', 'tensorflow', 'scikit-learn', 'nlp', 'computer vision'], badges: ['machine learning', 'artificial intelligence', 'deep learning', 'tensorflow', 'data science'], nptel: ['CS'], huggingface: true, gate: ['DA'] },
  { name: 'Cloud & DevOps', short: 'Cloud', langs: ['Dockerfile', 'HCL', 'Shell'], keywords: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'devops', 'linux'], badges: ['aws', 'azure', 'google cloud', 'kubernetes', 'devops', 'red hat', 'linux'] },
  APT,
  // ---- AI and data
  { name: 'Statistics & Probability', short: 'Statistics', langs: ['R'], files: ['notebook'], keywords: ['statistics', 'probability', 'hypothesis', 'regression', 'a/b test'], badges: ['statistics', 'data analysis', 'data analyst'], nptel: ['MA', 'CS'], gate: ['DA'] },
  { name: 'Deep Learning', short: 'Deep Learning', langs: ['Jupyter Notebook'], files: ['notebook'], keywords: ['deep learning', 'cnn', 'transformer', 'pytorch', 'tensorflow', 'llm'], badges: ['deep learning', 'tensorflow', 'neural'], huggingface: true, nptel: ['CS'] },
  { name: 'Data Engineering (SQL + pipelines)', short: 'Data Eng', langs: ['SQL', 'PLpgSQL', 'Scala'], keywords: ['etl', 'spark', 'airflow', 'data pipeline', 'sql', 'power bi', 'tableau'], badges: ['data engineer', 'power bi', 'tableau', 'databricks', 'snowflake'] },
  // ---- cyber security
  { name: 'Networking', short: 'Networking', keywords: ['tcp/ip', 'networking', 'routing', 'ccna', 'wireshark'], badges: ['ccna', 'networking', 'network', 'cisco'], nptel: ['CS', 'EE'], gate: ['CS', 'EC'] },
  { name: 'Security Fundamentals', short: 'Security', langs: ['Shell', 'PowerShell'], keywords: ['security', 'owasp', 'penetration', 'ctf', 'vulnerability', 'cryptography'], badges: ['security', 'cyber', 'ethical hack', 'comptia', 'ceh'], ctf: true, nptel: ['CS'] },
  { name: 'Linux & Scripting', short: 'Linux', langs: ['Shell', 'Python', 'PowerShell'], keywords: ['linux', 'bash', 'shell scripting'], badges: ['linux', 'red hat'] },
  // ---- electronics: VLSI, embedded, communication
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
  // ---- electrical
  { name: 'Electrical Machines', short: 'Machines', langs: ['MATLAB'], files: ['simulink'], keywords: ['induction motor', 'transformer', 'dc machine', 'synchronous', 'electrical machines'], badges: ['electrical machines', 'motor'], nptel: ['EE'], gate: ['EE'] },
  { name: 'Power Systems', short: 'Power', langs: ['MATLAB'], files: ['simulink'], keywords: ['power system', 'load flow', 'protection', 'substation', 'etap', 'pscad', 'grid'], badges: ['power system', 'etap', 'smart grid'], nptel: ['EE'], gate: ['EE'] },
  { name: 'Power Electronics', short: 'Power Elec', langs: ['MATLAB'], files: ['simulink', 'spice'], keywords: ['inverter', 'converter', 'pwm', 'power electronics', 'mosfet', 'igbt'], badges: ['power electronics'], nptel: ['EE'], gate: ['EE'] },
  { name: 'Control Systems', short: 'Control', langs: ['MATLAB'], files: ['simulink'], keywords: ['pid', 'control system', 'transfer function', 'state space', 'bode'], badges: ['control system', 'matlab', 'simulink'], nptel: ['EE', 'ME', 'CH'], gate: ['EE', 'IN', 'EC'] },
  { name: 'MATLAB / Simulink', short: 'MATLAB', langs: ['MATLAB'], files: ['simulink'], keywords: ['matlab', 'simulink'], badges: ['matlab', 'simulink', 'mathworks'] },
  { name: 'PLC & Industrial Automation', short: 'PLC', files: ['plc'], keywords: ['plc', 'scada', 'hmi', 'ladder logic', 'dcs', 'industrial automation'], badges: ['plc', 'scada', 'automation', 'siemens', 'rockwell', 'labview'], nptel: ['EE', 'ME'], gate: ['IN'] },
  { name: 'Instrumentation & Sensors', short: 'Instrumentation', langs: ['LabVIEW'], files: ['arduino', 'pcb'], keywords: ['sensor', 'transducer', 'instrumentation', 'labview', 'daq'], badges: ['labview', 'instrumentation', 'national instruments'], nptel: ['EE'], gate: ['IN', 'EE'] },
  { name: 'Battery & EV Systems', short: 'EV', langs: ['MATLAB'], files: ['simulink'], keywords: ['battery management', 'bms', 'electric vehicle', 'lithium', 'charging', 'motor drive'], badges: ['electric vehicle', 'battery', 'ev'], nptel: ['EE', 'ME'] },
  // ---- mechanical
  { name: 'CAD Modelling', short: 'CAD', files: ['cad3d'], keywords: ['solidworks', 'catia', 'creo', 'fusion 360', 'inventor', 'nx', '3d modelling'], badges: ['solidworks', 'catia', 'fusion 360', 'inventor', 'autodesk', 'creo', 'cad'], nptel: ['ME'] },
  { name: 'Engineering Drawing & GD&T', short: 'GD&T', files: ['cad2d', 'cad3d'], keywords: ['gd&t', 'engineering drawing', 'autocad', 'drafting', 'tolerancing'], badges: ['autocad', 'gd&t', 'drafting'], nptel: ['ME', 'CE'] },
  { name: 'Strength of Materials & Design', short: 'Design', langs: ['MATLAB'], keywords: ['strength of materials', 'machine design', 'stress analysis', 'fatigue'], nptel: ['ME', 'CE'], gate: ['ME', 'CE', 'PI'] },
  { name: 'FEA / CFD Simulation', short: 'Simulation', files: ['cad3d'], keywords: ['ansys', 'fea', 'cfd', 'abaqus', 'fluent', 'comsol', 'hypermesh'], badges: ['ansys', 'simulation', 'abaqus', 'comsol', 'hypermesh'], nptel: ['ME', 'AE', 'CH'] },
  { name: 'Thermodynamics & Fluids', short: 'Thermal', langs: ['MATLAB'], keywords: ['thermodynamics', 'heat transfer', 'fluid mechanics', 'refrigeration', 'hvac'], nptel: ['ME', 'CH', 'AE'], gate: ['ME', 'CH', 'AE', 'XE'] },
  { name: 'Manufacturing & Industrial Engineering', short: 'Manufacturing', files: ['cad3d'], keywords: ['manufacturing', 'cnc', 'lean', 'six sigma', 'kaizen', 'production', 'welding', 'casting', '3d printing'], badges: ['six sigma', 'lean', 'cnc', 'manufacturing', 'quality'], nptel: ['ME'], gate: ['ME', 'PI'] },
  { name: 'Automobile & Vehicle Systems', short: 'Automotive', files: ['cad3d', 'simulink'], keywords: ['automobile', 'baja', 'formula student', 'supra', 'vehicle dynamics', 'ic engine', 'powertrain'], badges: ['automotive', 'vehicle'], nptel: ['ME'], gate: ['ME'] },
  { name: 'Robotics & ROS', short: 'Robotics', langs: ['C++', 'Python'], files: ['ros'], keywords: ['ros', 'robotics', 'robot', 'gazebo', 'kinematics', 'slam'], badges: ['robotics', 'ros'], nptel: ['ME', 'EE'] },
  // ---- civil
  { name: 'Structural Analysis & Design (IS codes)', short: 'Structural', files: ['staad', 'etabs'], keywords: ['structural analysis', 'rcc design', 'steel design', 'is 456', 'is 800', 'is 1893'], badges: ['structural', 'staad', 'etabs'], nptel: ['CE'], gate: ['CE'] },
  { name: 'Structural Software (STAAD / ETABS)', short: 'STAAD', files: ['staad', 'etabs'], keywords: ['staad', 'etabs', 'sap2000', 'safe'], badges: ['staad', 'etabs', 'bentley', 'csi'] },
  { name: 'AutoCAD & BIM (Revit)', short: 'BIM', files: ['cad2d', 'bim'], keywords: ['autocad', 'revit', 'bim', 'navisworks'], badges: ['autocad', 'revit', 'bim', 'autodesk'], nptel: ['CE'] },
  { name: 'Construction Planning & Estimation', short: 'Planning', keywords: ['primavera', 'ms project', 'estimation', 'costing', 'quantity surveying', 'site execution'], badges: ['primavera', 'project management', 'pmp', 'capm'], nptel: ['CE'], gate: ['CE'] },
  { name: 'Geotechnical & Transportation', short: 'Geotech', keywords: ['soil mechanics', 'foundation', 'geotechnical', 'highway', 'pavement', 'surveying', 'gis'], badges: ['gis', 'surveying'], nptel: ['CE'], gate: ['CE'] },
  // ---- chemical / process
  { name: 'Chemical Thermodynamics & Transport', short: 'Transport', keywords: ['mass transfer', 'heat transfer', 'chemical thermodynamics', 'fluid mechanics', 'distillation'], nptel: ['CH'], gate: ['CH'] },
  { name: 'Reaction Engineering', short: 'Reactions', keywords: ['reaction engineering', 'reactor', 'kinetics', 'catalysis'], nptel: ['CH'], gate: ['CH'] },
  { name: 'Process Simulation (Aspen / DWSIM)', short: 'Simulation', files: ['aspen', 'dwsim'], keywords: ['aspen plus', 'aspen hysys', 'dwsim', 'chemcad', 'process simulation'], badges: ['aspen', 'process simulation'], nptel: ['CH'] },
  { name: 'Process Control & Safety', short: 'Process Ctrl', langs: ['MATLAB'], files: ['simulink'], keywords: ['process control', 'hazop', 'process safety', 'p&id'], badges: ['process safety', 'hazop'], nptel: ['CH'], gate: ['CH'] },
  // ---- life sciences
  { name: 'Molecular Biology & Lab Techniques', short: 'Lab', keywords: ['pcr', 'western blot', 'cell culture', 'elisa', 'gel electrophoresis'], nptel: ['BT'], gate: ['BT', 'XL'] },
  { name: 'Bioprocess Engineering', short: 'Bioprocess', keywords: ['bioprocess', 'fermentation', 'downstream processing', 'bioreactor'], nptel: ['BT', 'CH'], gate: ['BT'] },
  { name: 'Bioinformatics', short: 'Bioinfo', langs: ['Python', 'R', 'Jupyter Notebook'], files: ['notebook'], keywords: ['bioinformatics', 'genomics', 'sequence alignment', 'blast', 'biopython'], badges: ['bioinformatics', 'genomics'], nptel: ['BT'] },
  // ---- materials, metallurgy, mining
  { name: 'Materials & Metallurgy', short: 'Materials', keywords: ['metallurgy', 'heat treatment', 'phase diagram', 'materials characterization', 'xrd', 'sem'], nptel: ['MM', 'ME'], gate: ['MT'] },
]

export const SKILL_BY_NAME = new Map(SKILL_RULES.map((s) => [s.name, s]))
export const skillShort = (name: string) => SKILL_BY_NAME.get(name)?.short ?? name

const SOFTWARE = ['Data Structures & Algorithms', 'System Design', 'React / Frontend', 'Node.js / Backend', 'Databases (SQL + NoSQL)', 'Machine Learning', 'Cloud & DevOps', 'Aptitude & Reasoning']

/** Tracks a student can prepare for. `categories` are the company categories that recruit for the track. */
export const TRACKS: Track[] = [
  { id: 'software', label: 'Software engineering', families: ['computing', 'electronics', 'electrical', 'mechanical', 'mechatronics', 'civil', 'chemical', 'lifesci', 'materials'], blurb: 'Product companies, IT services and startups. Open to every branch.', skills: SOFTWARE, resumeKeywords: ['data structures', 'algorithms', 'react', 'node', 'sql', 'api', 'git', 'docker', 'java', 'python'], categories: ['top', 'quant', 'ai', 'product', 'fintech', 'startup', 'infra', 'hardware', 'service', 'consulting'] },
  { id: 'ai_data', label: 'AI, ML and data', families: ['computing', 'electronics', 'electrical'], blurb: 'Data science, ML engineering and analytics roles.', skills: ['Machine Learning', 'Deep Learning', 'Statistics & Probability', 'Data Engineering (SQL + pipelines)', 'Data Structures & Algorithms', 'Aptitude & Reasoning'], resumeKeywords: ['machine learning', 'python', 'pandas', 'pytorch', 'tensorflow', 'sql', 'statistics', 'model', 'dataset', 'accuracy'], categories: ['ai', 'top', 'product', 'service', 'consulting'] },
  { id: 'cyber', label: 'Cyber security', families: ['computing', 'electronics'], blurb: 'Security operations, application security and network security.', skills: ['Networking', 'Security Fundamentals', 'Linux & Scripting', 'Data Structures & Algorithms', 'Aptitude & Reasoning'], resumeKeywords: ['security', 'network', 'linux', 'owasp', 'ctf', 'wireshark', 'burp', 'siem', 'firewall', 'vulnerability'], categories: ['security', 'infra', 'service', 'consulting'] },
  { id: 'vlsi', label: 'VLSI and chip design', families: ['electronics', 'electrical'], blurb: 'RTL design, verification and physical design at semiconductor companies.', skills: ['Digital Design', 'Verilog / SystemVerilog', 'Verification & Timing (UVM/STA)', 'Analog & CMOS Circuits', 'Aptitude & Reasoning'], resumeKeywords: ['verilog', 'systemverilog', 'rtl', 'fpga', 'uvm', 'synthesis', 'timing', 'cmos', 'vivado', 'cadence'], categories: ['semiconductor', 'hardware'] },
  { id: 'embedded', label: 'Embedded systems and IoT', families: ['electronics', 'electrical', 'mechatronics', 'computing'], blurb: 'Firmware, IoT devices and automotive electronics.', skills: ['Embedded C', 'Microcontrollers & Protocols', 'PCB Design', 'RTOS & Embedded Linux', 'Digital Design', 'Aptitude & Reasoning'], resumeKeywords: ['embedded c', 'firmware', 'stm32', 'esp32', 'arduino', 'uart', 'spi', 'i2c', 'rtos', 'pcb'], categories: ['embedded', 'semiconductor'] },
  { id: 'comms', label: 'Communication and RF', families: ['electronics'], blurb: 'Telecom, wireless and signal processing roles.', skills: ['Signals & Systems', 'Communication Systems', 'Networking', 'MATLAB / Simulink', 'Aptitude & Reasoning'], resumeKeywords: ['signal processing', 'matlab', 'modulation', 'wireless', 'rf', 'antenna', '5g', 'dsp', 'simulink', 'lte'], categories: ['telecom', 'semiconductor'] },
  { id: 'power', label: 'Power and energy', families: ['electrical'], blurb: 'Power utilities, transmission, renewables and electrical equipment makers.', skills: ['Power Systems', 'Electrical Machines', 'Power Electronics', 'Control Systems', 'MATLAB / Simulink', 'Aptitude & Reasoning'], resumeKeywords: ['power system', 'transformer', 'substation', 'protection', 'inverter', 'matlab', 'simulink', 'etap', 'solar', 'grid'], categories: ['electrical', 'energy'] },
  { id: 'automation', label: 'Industrial automation', families: ['electrical', 'electronics', 'mechatronics', 'mechanical'], blurb: 'PLC, SCADA, drives and instrumentation in plants and factories.', skills: ['PLC & Industrial Automation', 'Control Systems', 'Instrumentation & Sensors', 'Electrical Machines', 'Aptitude & Reasoning'], resumeKeywords: ['plc', 'scada', 'hmi', 'ladder', 'drives', 'sensors', 'instrumentation', 'control', 'automation', 'labview'], categories: ['electrical', 'automation'] },
  { id: 'ev', label: 'Electric vehicles', families: ['electrical', 'mechanical', 'mechatronics'], blurb: 'Batteries, motor drives and powertrain at EV and automotive companies.', skills: ['Battery & EV Systems', 'Power Electronics', 'Electrical Machines', 'MATLAB / Simulink', 'Aptitude & Reasoning'], resumeKeywords: ['battery', 'bms', 'electric vehicle', 'motor', 'inverter', 'matlab', 'simulink', 'charging', 'powertrain', 'thermal'], categories: ['automotive', 'electrical'] },
  { id: 'mech_design', label: 'Design and simulation', families: ['mechanical', 'mechatronics'], blurb: 'Product design, CAD and simulation roles at OEMs and engineering services.', skills: ['CAD Modelling', 'Engineering Drawing & GD&T', 'Strength of Materials & Design', 'FEA / CFD Simulation', 'Aptitude & Reasoning'], resumeKeywords: ['solidworks', 'catia', 'creo', 'ansys', 'gd&t', 'design', 'fea', 'cfd', 'drawing', 'tolerance'], categories: ['automotive', 'manufacturing', 'engineering_services'] },
  { id: 'manufacturing', label: 'Manufacturing and production', families: ['mechanical', 'mechatronics', 'materials'], blurb: 'Plant, production, quality and supply-chain roles.', skills: ['Manufacturing & Industrial Engineering', 'CAD Modelling', 'Thermodynamics & Fluids', 'Strength of Materials & Design', 'Aptitude & Reasoning'], resumeKeywords: ['manufacturing', 'production', 'lean', 'six sigma', 'quality', 'cnc', 'kaizen', 'plant', 'supply chain', '5s'], categories: ['manufacturing', 'automotive'] },
  { id: 'automotive', label: 'Automotive', families: ['mechanical', 'mechatronics'], blurb: 'Vehicle engineering at automakers and suppliers.', skills: ['Automobile & Vehicle Systems', 'CAD Modelling', 'Thermodynamics & Fluids', 'FEA / CFD Simulation', 'Aptitude & Reasoning'], resumeKeywords: ['automobile', 'vehicle', 'baja', 'formula student', 'engine', 'powertrain', 'chassis', 'suspension', 'catia', 'ansys'], categories: ['automotive'] },
  { id: 'robotics', label: 'Robotics', families: ['mechatronics', 'mechanical', 'electronics', 'electrical'], blurb: 'Robotics, automation and autonomous systems.', skills: ['Robotics & ROS', 'Control Systems', 'Embedded C', 'CAD Modelling', 'Aptitude & Reasoning'], resumeKeywords: ['ros', 'robot', 'kinematics', 'gazebo', 'control', 'embedded', 'python', 'c++', 'slam', 'automation'], categories: ['automation', 'automotive', 'embedded'] },
  { id: 'structural', label: 'Structural engineering', families: ['civil'], blurb: 'Structural design at consultancies and EPC companies.', skills: ['Structural Analysis & Design (IS codes)', 'Structural Software (STAAD / ETABS)', 'AutoCAD & BIM (Revit)', 'Geotechnical & Transportation', 'Aptitude & Reasoning'], resumeKeywords: ['staad', 'etabs', 'rcc', 'steel', 'is 456', 'structural', 'autocad', 'revit', 'design', 'foundation'], categories: ['construction'] },
  { id: 'construction', label: 'Construction and project management', families: ['civil'], blurb: 'Site execution, planning and estimation at construction and infrastructure companies.', skills: ['Construction Planning & Estimation', 'AutoCAD & BIM (Revit)', 'Structural Analysis & Design (IS codes)', 'Geotechnical & Transportation', 'Aptitude & Reasoning'], resumeKeywords: ['site', 'execution', 'estimation', 'primavera', 'ms project', 'quantity', 'autocad', 'billing', 'safety', 'construction'], categories: ['construction'] },
  { id: 'process', label: 'Process and chemical', families: ['chemical', 'lifesci'], blurb: 'Refineries, chemicals, pharma and FMCG process roles.', skills: ['Chemical Thermodynamics & Transport', 'Reaction Engineering', 'Process Simulation (Aspen / DWSIM)', 'Process Control & Safety', 'Aptitude & Reasoning'], resumeKeywords: ['process', 'aspen', 'hysys', 'distillation', 'reactor', 'heat exchanger', 'hazop', 'plant', 'p&id', 'mass transfer'], categories: ['process', 'energy'] },
  { id: 'biotech', label: 'Biotech and pharma', families: ['lifesci', 'chemical'], blurb: 'Research, bioprocess and quality roles in biotech and pharma.', skills: ['Molecular Biology & Lab Techniques', 'Bioprocess Engineering', 'Bioinformatics', 'Aptitude & Reasoning'], resumeKeywords: ['pcr', 'cell culture', 'fermentation', 'bioinformatics', 'assay', 'gmp', 'elisa', 'downstream', 'research', 'lab'], categories: ['biotech'] },
  { id: 'materials', label: 'Materials and metallurgy', families: ['materials', 'mechanical'], blurb: 'Steel, metals and materials companies.', skills: ['Materials & Metallurgy', 'Manufacturing & Industrial Engineering', 'Thermodynamics & Fluids', 'Aptitude & Reasoning'], resumeKeywords: ['metallurgy', 'heat treatment', 'steel', 'materials', 'casting', 'welding', 'quality', 'xrd', 'sem', 'testing'], categories: ['manufacturing', 'process'] },
]
export const TRACK_BY_ID = new Map(TRACKS.map((t) => [t.id, t]))

/**
 * BTech branches as colleges spell them, with their family. A name can match several codes ("CSE (AI & ML)" is CSE-AIML,
 * AI and CSE), so a drive open to "CSE" still includes CSE (AI & ML) students; the first match is the branch's own code.
 */
export const BRANCHES: { code: string; name: string; family: Family; re: RegExp }[] = [
  { code: 'CSE-AIML', name: 'CSE (AI & ML)', family: 'computing', re: /\b(aiml|ai ?& ?ml|ai ?\/ ?ml|artificial intelligence( and| &)? machine learning)\b/i },
  { code: 'AIDS', name: 'AI & Data Science', family: 'computing', re: /\b(ai ?& ?ds|aids|artificial intelligence( and| &)? data science)\b/i },
  { code: 'DS', name: 'Data Science', family: 'computing', re: /\b(ds|data science)\b/i },
  { code: 'CSE-CS', name: 'CSE (Cyber Security)', family: 'computing', re: /\b(cyber ?security|cse ?\(?cs\)?|cs ?& ?cs)\b/i },
  { code: 'CSE-IOT', name: 'CSE (IoT)', family: 'computing', re: /\b(cse ?\(?iot\)?|internet of things)\b/i },
  { code: 'CSBS', name: 'CS & Business Systems', family: 'computing', re: /\b(csbs|business systems)\b/i },
  { code: 'AI', name: 'Artificial Intelligence', family: 'computing', re: /\b(artificial intelligence|ai)\b/i },
  { code: 'CSE', name: 'Computer Science & Engineering', family: 'computing', re: /\b(cse|computer science|cs|computer engineering)\b/i },
  { code: 'IT', name: 'Information Technology', family: 'computing', re: /\b(it|information technology)\b/i },
  { code: 'VLSI', name: 'Electronics (VLSI Design)', family: 'electronics', re: /\b(vlsi)\b/i },
  { code: 'ECM', name: 'Electronics & Computer Engineering', family: 'electronics', re: /\b(ecm|electronics( and| &)? computer)\b/i },
  { code: 'EIN', name: 'Electrical & Instrumentation', family: 'electrical', re: /\b(electrical( and| &)? instrumentation)\b/i },
  { code: 'EIE', name: 'Electronics & Instrumentation', family: 'electronics', re: /\b(eie|e ?& ?i|electronics( and| &)? instrumentation|instrumentation)\b/i },
  { code: 'ETE', name: 'Electronics & Telecommunication', family: 'electronics', re: /\b(ete|extc|e ?& ?tc|telecommunication)\b/i },
  { code: 'ECE', name: 'Electronics & Communication', family: 'electronics', re: /\b(ece|electronics( and| &)? communication)\b/i },
  { code: 'EEE', name: 'Electrical & Electronics', family: 'electrical', re: /\b(eee|electrical( and| &)? electronics)\b/i },
  { code: 'EE', name: 'Electrical Engineering', family: 'electrical', re: /\b(ee|electrical)\b/i },
  { code: 'MECHATRONICS', name: 'Mechatronics', family: 'mechatronics', re: /\b(mechatronics)\b/i },
  { code: 'ROBOTICS', name: 'Robotics & Automation', family: 'mechatronics', re: /\b(robotics|automation)\b/i },
  { code: 'AUTO', name: 'Automobile Engineering', family: 'mechanical', re: /\b(automobile|automotive)\b/i },
  { code: 'AERO', name: 'Aeronautical / Aerospace', family: 'mechanical', re: /\b(aeronautical|aerospace|aero)\b/i },
  { code: 'PROD', name: 'Production / Industrial', family: 'mechanical', re: /\b(production|industrial engineering|manufacturing)\b/i },
  { code: 'MARINE', name: 'Marine Engineering', family: 'mechanical', re: /\b(marine|naval)\b/i },
  { code: 'MECH', name: 'Mechanical Engineering', family: 'mechanical', re: /\b(mech|mechanical|me)\b/i },
  { code: 'CIVIL', name: 'Civil Engineering', family: 'civil', re: /\b(civil|construction|environmental|transportation engineering)\b/i },
  { code: 'PETRO', name: 'Petroleum Engineering', family: 'chemical', re: /\b(petroleum|petrochemical)\b/i },
  { code: 'CHEM', name: 'Chemical Engineering', family: 'chemical', re: /\b(chemical|polymer|food tech(nology)?)\b/i },
  { code: 'BIOTECH', name: 'Biotechnology', family: 'lifesci', re: /\b(biotech(nology)?|bio-?technology)\b/i },
  { code: 'BME', name: 'Biomedical Engineering', family: 'lifesci', re: /\b(biomedical|bme)\b/i },
  { code: 'META', name: 'Metallurgy & Materials', family: 'materials', re: /\b(metallurg(y|ical)|materials)\b/i },
  { code: 'MINING', name: 'Mining Engineering', family: 'materials', re: /\b(mining)\b/i },
  { code: 'TEXTILE', name: 'Textile Engineering', family: 'materials', re: /\b(textile)\b/i },
  { code: 'AGRI', name: 'Agricultural Engineering', family: 'materials', re: /\b(agricultur(e|al))\b/i },
]

export const FAMILY_LABEL: Record<Family, string> = {
  computing: 'Computing', electronics: 'Electronics', electrical: 'Electrical', mechanical: 'Mechanical', mechatronics: 'Mechatronics & robotics',
  civil: 'Civil', chemical: 'Chemical & process', lifesci: 'Life sciences', materials: 'Materials, mining & others',
}

/** Every code a branch name matches (most specific first). Unknown names keep their own text. */
export const branchCodesOf = (s: string) => {
  const codes = BRANCHES.filter((b) => b.re.test(s)).map((b) => b.code)
  return codes.length ? codes : [s.trim().toUpperCase()]
}

/** The branch a free-text name refers to, or null when it is not recognised. */
export const branchOf = (s: string | null | undefined) => {
  const t = String(s ?? '').trim()
  return t ? BRANCHES.find((b) => b.re.test(t)) ?? null : null
}
export const familyOf = (branch: string | null | undefined): Family => branchOf(branch)?.family ?? 'computing'

/** Default tracks for a branch before the student chooses (keeps existing computing students on software). */
export const DEFAULT_TRACKS: Record<Family, string[]> = {
  computing: ['software'], electronics: ['embedded', 'software'], electrical: ['power', 'software'], mechanical: ['mech_design'],
  mechatronics: ['robotics'], civil: ['structural'], chemical: ['process'], lifesci: ['biotech'], materials: ['materials'],
}
export const DEFAULT_TRACK_FOR: Record<string, string[]> = { 'CSE-AIML': ['ai_data', 'software'], AIDS: ['ai_data', 'software'], DS: ['ai_data', 'software'], AI: ['ai_data', 'software'], 'CSE-CS': ['cyber', 'software'], 'CSE-IOT': ['embedded', 'software'], VLSI: ['vlsi'], AUTO: ['automotive'], PROD: ['manufacturing'], EIE: ['automation', 'embedded'], META: ['materials'] }

export const tracksFor = (p: { tracks?: string[] | null; branch?: string | null }) => {
  const own = (p.tracks ?? []).filter((t) => TRACK_BY_ID.has(t))
  if (own.length) return own
  const b = branchOf(p.branch)
  return b ? DEFAULT_TRACK_FOR[b.code] ?? DEFAULT_TRACKS[b.family] : ['software']
}

/** Skills a student is measured on: the union of their tracks' skills, in track order. */
export const skillsForTracks = (tracks: string[]) => [...new Set(tracks.flatMap((t) => TRACK_BY_ID.get(t)?.skills ?? []))]
export const skillsFor = (p: { tracks?: string[] | null; branch?: string | null }) => skillsForTracks(tracksFor(p))

/** Tracks offered to a branch (its family's tracks; software is open to everyone). */
export const tracksForBranch = (branch: string | null | undefined) => {
  const f = familyOf(branch)
  return TRACKS.filter((t) => t.families.includes(f))
}

// ---------------------------------------------------------------- objective file signals in GitHub repositories

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
