// Themed chart kit (Recharts). Rules: one axis, recessive grid, thin marks with rounded data ends,
// hover tooltips everywhere, legends for 2+ series, text in ink tokens (never series colors).
import type { ReactNode } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, PolarAngleAxis, PolarGrid,
  PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'

export const SERIES = ['#2D5FA0', '#B47B12', '#0A7A5C'] // slate, ochre, green: validated for CVD on the paper surface
export const BRAND = '#0F5A45'
export const STATUS = { eligible: '#0A7A5C', nearly: '#B47B12', canBecome: '#2D5FA0', notEligible: '#A63A2A' } as const
const INK = { primary: '#1E1D1A', secondary: '#6D685F', faint: '#948E82', grid: '#E3DDD1' }
const axis = { tick: { fill: INK.faint, fontSize: 11 }, axisLine: false, tickLine: false } as const

function TooltipBox({ active, payload, label, format }: { active?: boolean; payload?: any[]; label?: ReactNode; format?: (v: number, name: string) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[3px] border border-rule-strong bg-surface px-3 py-2 text-[11.5px]">
      {label !== undefined && label !== '' && <p className="mb-1 font-semibold text-ink">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2 text-ink-soft">
          <span className="h-2 w-2" style={{ background: p.color ?? p.payload?.fill }} />
          <span>{p.name}</span>
          <span className="figure ml-auto pl-3 font-medium text-ink">{format ? format(p.value, p.name) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function EmptyChart({ children, height = 220 }: { children: ReactNode; height?: number }) {
  return (
    <div className="grid place-items-center rounded-[3px] border border-dashed border-rule-strong text-center text-[12px] text-ink-faint" style={{ height }}>
      <div className="max-w-[280px] px-4">{children}</div>
    </div>
  )
}

/** Change over time. One axis; multiple series share it (all are 0-100 scores or counts). */
export function TrendChart({
  data, x, series, height = 220, domain,
}: {
  data: Record<string, any>[]
  x: string
  series: { key: string; name: string; color: string }[]
  height?: number
  domain?: [number | 'auto', number | 'auto']
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={INK.grid} vertical={false} />
        <XAxis dataKey={x} {...axis} minTickGap={24} />
        <YAxis {...axis} domain={domain ?? ['auto', 'auto']} width={44} />
        <Tooltip content={<TooltipBox />} cursor={{ stroke: INK.faint, strokeDasharray: '3 3' }} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11.5, color: INK.secondary, paddingTop: 6 }} />}
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            fill={s.color}
            fillOpacity={series.length > 1 ? 0 : 0.1}
            dot={false}
            activeDot={{ r: 4.5, strokeWidth: 2, stroke: '#FBF9F4' }}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Part-to-whole for a handful of labeled states, with the total in the middle. */
export function Donut({ data, height = 200, centerLabel }: { data: { name: string; value: number; color: string }[]; height?: number; centerLabel?: string }) {
  const total = data.reduce((a, d) => a + d.value, 0)
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="92%" paddingAngle={1.5} cornerRadius={1} stroke="none" isAnimationActive={false}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip content={<TooltipBox format={(v) => `${v} (${Math.round((v / Math.max(1, total)) * 100)}%)`} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="figure text-[26px] font-medium leading-none text-ink">{total}</p>
          {centerLabel && <p className="mt-1 text-[10.5px] text-ink-mute">{centerLabel}</p>}
        </div>
      </div>
    </div>
  )
}

/** Compare two profiles across the same skill axes. */
export function SkillRadar({ data, height = 300, aName, bName }: { data: { skill: string; a: number; b: number }[]; height?: number; aName: string; bName: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
        <PolarGrid stroke={INK.grid} />
        <PolarAngleAxis dataKey="skill" tick={{ fill: INK.secondary, fontSize: 10.5 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name={bName} dataKey="b" stroke={SERIES[1]} strokeWidth={2} fill={SERIES[1]} fillOpacity={0.08} strokeDasharray="5 4" isAnimationActive={false} />
        <Radar name={aName} dataKey="a" stroke={BRAND} strokeWidth={2} fill={BRAND} fillOpacity={0.12} isAnimationActive={false} />
        <Tooltip content={<TooltipBox format={(v) => `${v}%`} />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11.5, color: INK.secondary }} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

/** Horizontal ranked bars for a single measure. */
export function BarList({ data, height, unit = '', color = BRAND, max }: { data: { name: string; value: number; color?: string }[]; height?: number; unit?: string; color?: string; max?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(120, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 4, bottom: 0 }} barCategoryGap={8}>
        <CartesianGrid stroke={INK.grid} horizontal={false} />
        <XAxis type="number" {...axis} domain={[0, max ?? 'auto']} hide />
        <YAxis type="category" dataKey="name" {...axis} tick={{ fill: INK.secondary, fontSize: 11.5 }} width={170} tickFormatter={(v: string) => (v.length > 26 ? `${v.slice(0, 25)}…` : v)} />
        <Tooltip content={<TooltipBox format={(v) => `${v}${unit}`} />} cursor={{ fill: 'rgba(15,90,69,0.06)' }} />
        <Bar dataKey="value" name="Value" radius={[0, 2, 2, 0]} maxBarSize={22} isAnimationActive={false} label={{ position: 'right', fill: INK.secondary, fontSize: 11, formatter: (v: unknown) => `${v}${unit}` }}>
          {data.map((d) => <Cell key={d.name} fill={d.color ?? color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Vertical bars over time or category, single series. */
export function Columns({ data, x, y, name, height = 200, color = BRAND, unit = '', domain }: { data: Record<string, any>[]; x: string; y: string; name: string; height?: number; color?: string; unit?: string; domain?: [number, number] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke={INK.grid} vertical={false} />
        <XAxis dataKey={x} {...axis} />
        <YAxis {...axis} width={44} domain={domain ?? [0, 'auto']} allowDecimals={false} />
        <Tooltip content={<TooltipBox format={(v) => `${v}${unit}`} />} cursor={{ fill: 'rgba(15,90,69,0.06)' }} />
        <Bar dataKey={y} name={name} fill={color} radius={[2, 2, 0, 0]} maxBarSize={44} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Every company: how well you match (x) against what it pays (y), colored by stack. */
export function CompanyScatter({ data, height = 320 }: { data: { name: string; match: number; ctc: number; bucket: keyof typeof STATUS; label: string }[]; height?: number }) {
  const groups = (Object.keys(STATUS) as (keyof typeof STATUS)[]).map((b) => ({ b, rows: data.filter((d) => d.bucket === b) }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
        <CartesianGrid stroke={INK.grid} />
        <XAxis type="number" dataKey="match" name="Match" unit="%" domain={[0, 100]} {...axis} />
        <YAxis type="number" dataKey="ctc" name="CTC" unit=" L" {...axis} width={52} />
        <ZAxis range={[70, 70]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3', stroke: INK.faint }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <div className="rounded-[3px] border border-rule-strong bg-surface px-3 py-2 text-[11.5px]">
                <p className="font-semibold text-ink">{payload[0].payload.name}</p>
                <p className="text-ink-soft">{payload[0].payload.label} · {payload[0].payload.match}% match · ₹{payload[0].payload.ctc} LPA</p>
              </div>
            ) : null
          }
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11.5, color: INK.secondary }} />
        {groups.map(({ b, rows }) => (
          <Scatter key={b} name={rows[0]?.label ?? b} data={rows} fill={STATUS[b]} stroke="#FBF9F4" strokeWidth={1.5} isAnimationActive={false} />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  )
}
