/**
 * Build a Google Calendar "Add event" URL from event details.
 */
export function googleCalendarUrl(opts: {
  title: string
  start: string | Date
  location?: string | null
  details?: string
  durationHours?: number
}): string {
  const start = new Date(opts.start)
  const end = new Date(start.getTime() + (opts.durationHours ?? 3) * 60 * 60 * 1000)

  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${fmt(start)}/${fmt(end)}`,
  })
  if (opts.location) params.set('location', opts.location)
  if (opts.details) params.set('details', opts.details)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Download a minimal .ics file for the event.
 */
export function downloadIcs(opts: {
  title: string
  start: string | Date
  location?: string | null
  details?: string
  durationHours?: number
  filename?: string
}): void {
  const start = new Date(opts.start)
  const end = new Date(start.getTime() + (opts.durationHours ?? 3) * 60 * 60 * 1000)

  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z')

  const escape = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TRFC//Tickets//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escape(opts.title)}`,
  ]
  if (opts.location) lines.push(`LOCATION:${escape(opts.location)}`)
  if (opts.details) lines.push(`DESCRIPTION:${escape(opts.details)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = opts.filename || 'trfc-event.ics'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
