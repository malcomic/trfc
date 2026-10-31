import { query } from '../config/db.js'
import { sendEmail } from './emailService.js'
import { buildWaitlistSpotEmailHTML, buildWaitlistSpotEmailText } from './emailTemplates.js'
import { loadSeatState } from './seatPriority.js'
import { poolDb } from './wallet.js'
import { toKenyanMsisdn } from './phone.js'
import { sendWaitlistSpot } from './whatsapp.js'
import { siteUrl } from './emailTemplates.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NOTIFY_PER_RELEASE = 10

export class WaitlistError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export async function joinWaitlist(
  eventId: string,
  entry: { userId?: string | null; name?: string | null; email: string; phone?: string | null }
) {
  const email = String(entry.email || '').trim().toLowerCase()
  if (!EMAIL_PATTERN.test(email)) throw new WaitlistError('Enter a valid email address')
  const event = await query(
    `SELECT id FROM events WHERE id = $1 AND is_active = true AND cancelled_at IS NULL AND event_date >= CURRENT_DATE`,
    [eventId]
  )
  if (event.rows.length === 0) throw new WaitlistError('Event not found', 404)
  await query(
    `INSERT INTO event_waitlist (event_id, user_id, name, email, phone)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (event_id, email) DO UPDATE SET notified_at = NULL, user_id = COALESCE(EXCLUDED.user_id, event_waitlist.user_id)`,
    [eventId, entry.userId ?? null, entry.name?.trim().slice(0, 150) || null, email, entry.phone ?? null]
  )
  const position = await query(
    `SELECT COUNT(*)::int AS ahead FROM event_waitlist
     WHERE event_id = $1 AND notified_at IS NULL
       AND created_at < (SELECT created_at FROM event_waitlist WHERE event_id = $1 AND email = $2)`,
    [eventId, email]
  )
  return { position: Number(position.rows[0]?.ahead ?? 0) + 1 }
}

/**
 * Tells the next people on the waiting list that seats opened (early cancellations, released
 * reservations, member seats opening to everyone). One email per person per opening; first to book wins.
 */
export async function notifyWaitlist(eventId: string): Promise<number> {
  try {
    const state = await loadSeatState(poolDb, eventId)
    const open = state?.openAvailable
    if (open === 0) return 0
    const count = Math.min(MAX_NOTIFY_PER_RELEASE, open ?? MAX_NOTIFY_PER_RELEASE)
    const next = await query(
      `UPDATE event_waitlist SET notified_at = NOW()
       WHERE id IN (
         SELECT id FROM event_waitlist WHERE event_id = $1 AND notified_at IS NULL ORDER BY created_at LIMIT $2
       )
       RETURNING name, email, phone`,
      [eventId, count]
    )
    if (next.rows.length === 0) return 0
    const event = await query('SELECT title FROM events WHERE id = $1', [eventId])
    const eventTitle = event.rows[0]?.title ?? 'TRFC event'
    for (const row of next.rows as { name: string | null; email: string; phone: string | null }[]) {
      const data = { name: row.name, eventTitle, eventId }
      sendEmail({
        to: row.email,
        subject: `A spot opened — ${eventTitle}`,
        html: buildWaitlistSpotEmailHTML(data),
        text: buildWaitlistSpotEmailText(data),
      }).catch((error) => console.error('Waitlist email failed:', error))
      const phone = row.phone ? toKenyanMsisdn(row.phone) : null
      if (phone) {
        sendWaitlistSpot(phone, {
          firstName: row.name?.trim().split(/\s+/)[0] || 'there',
          eventTitle,
          link: siteUrl(`/events/${eventId}`),
        }).catch((error) => console.error('Waitlist WhatsApp failed:', error))
      }
    }
    return next.rows.length
  } catch (error) {
    console.error(`Failed to notify the waiting list for event ${eventId}:`, error)
    return 0
  }
}

/** Everyone waiting for an event, in order, for the admin. Contact details are only shown to admins. */
export async function listWaitlist(eventId: string) {
  const result = await query(
    `SELECT id, name, email, phone, user_id IS NOT NULL AS has_account, created_at, notified_at
     FROM event_waitlist WHERE event_id = $1 ORDER BY created_at`,
    [eventId]
  )
  return result.rows
}

/** Waiting-list sizes (people not yet told about a seat) per event. */
export async function waitlistCounts(eventIds: string[]): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map()
  const result = await query(
    `SELECT event_id, COUNT(*) FILTER (WHERE notified_at IS NULL)::int AS waiting
     FROM event_waitlist WHERE event_id = ANY($1::uuid[]) GROUP BY event_id`,
    [eventIds]
  )
  return new Map(result.rows.map((r: { event_id: string; waiting: number }) => [r.event_id, Number(r.waiting)]))
}
