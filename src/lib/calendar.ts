// Calendar files (.ics) for drive deadlines, so a student can put "apply by" dates in their own calendar.

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1')
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const dayAfter = (ymd: string) => new Date(Date.parse(`${ymd}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)

/** Long lines are folded at 75 bytes, as RFC 5545 asks; some calendars refuse files that are not. */
const fold = (line: string) => line.match(/.{1,73}/gu)?.join('\r\n ') ?? line

/**
 * An all-day event on the deadline date (deadlines are dates in India, and an all-day event has no time zone to get
 * wrong), with a reminder the morning before.
 */
export function deadlineIcs(job: { id: string; company: string; role: string; deadline: string; location?: string | null }, origin: string, now = new Date()) {
  const day = job.deadline.slice(0, 10)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PlacementIQ//Drive deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:drive-${job.id}@placementiq`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${day.replace(/-/g, '')}`,
    `DTEND;VALUE=DATE:${dayAfter(day).replace(/-/g, '')}`,
    `SUMMARY:${esc(`Apply by today: ${job.company} (${job.role})`)}`,
    `DESCRIPTION:${esc(`Last day to apply to ${job.company} for ${job.role} on PlacementIQ.\n${origin}/jobs`)}`,
    ...(job.location ? [`LOCATION:${esc(job.location)}`] : []),
    `URL:${origin}/jobs`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(`${job.company} applications close tomorrow`)}`,
    'TRIGGER:-PT15H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}
