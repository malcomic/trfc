export const DEFAULT_EARLY_HOURS = 48

interface EarlyEvent {
  member_early_booking?: boolean | null
  created_at?: Date | string | null
}

/** End of the members-only booking window, counted from when the event was created. */
export function earlyUntil(event: EarlyEvent, hours: number): Date | null {
  if (!event.member_early_booking || !event.created_at) return null
  const created = new Date(event.created_at)
  if (Number.isNaN(created.getTime())) return null
  return new Date(created.getTime() + hours * 60 * 60 * 1000)
}

export function formatNairobiTime(at: Date): string {
  return at.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Nairobi' })
}

export function earlyWindowOpen(event: EarlyEvent, hours: number, now: Date = new Date()): boolean {
  const until = earlyUntil(event, hours)
  return until != null && now.getTime() < until.getTime()
}
