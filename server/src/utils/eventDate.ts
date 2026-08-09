/**
 * Event dates are stored as TIMESTAMP WITHOUT TIME ZONE (wall-clock Kenya time).
 * They are often serialized with a trailing "Z". Format with timeZone: 'UTC' so
 * the clock digits match what the admin entered (no +3h Kenya shift).
 */

export function parseEventDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatEventDate(value: string | Date | null | undefined): string {
  const d = parseEventDate(value)
  if (!d) return ''
  return d.toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatEventTime(value: string | Date | null | undefined): string {
  const d = parseEventDate(value)
  if (!d) return ''
  return d.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

export function formatEventDateShort(value: string | Date | null | undefined): string {
  const d = parseEventDate(value)
  if (!d) return ''
  return d.toLocaleDateString('en-KE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
