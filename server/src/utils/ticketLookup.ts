import jwt from 'jsonwebtoken'
import { query } from '../config/db.js'
import { phonesMatch, toKenyanMsisdn } from './phone.js'
import { isUuid } from './zones.js'

export const TICKET_ACCESS_MINUTES = 15
export const GATE_SEARCH_LIMIT = 10
const MIN_NAME_SEARCH_LENGTH = 4

interface TicketAccessPayload {
  scope: 'ticket-access'
  ref: string
}

// A separate secret keeps ticket access tokens from being accepted as login or flash tokens.
function ticketAccessSecret(): string {
  return `${process.env.JWT_SECRET || ''}:ticket-access`
}

export function signTicketAccessToken(checkoutRequestId: string): string {
  const payload: TicketAccessPayload = { scope: 'ticket-access', ref: checkoutRequestId }
  return jwt.sign(payload, ticketAccessSecret(), { expiresIn: TICKET_ACCESS_MINUTES * 60 })
}

/** Returns the checkout reference the token was issued for, or null if it is invalid or expired. */
export function verifyTicketAccessToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, ticketAccessSecret()) as Partial<TicketAccessPayload>
    if (decoded?.scope !== 'ticket-access' || typeof decoded.ref !== 'string') return null
    return decoded.ref
  } catch {
    return null
  }
}

export function normalizeReceipt(receipt: string): string {
  return receipt.replace(/\s+/g, '').toUpperCase()
}

/** Paid tickets bought with this M-Pesa receipt, restricted to those whose phone matches. */
export async function findPaidTicketsByReceipt(receipt: string, phone: string) {
  const normalized = normalizeReceipt(receipt)
  if (!normalized || !phone) return []

  const result = await query(
    `SELECT
       t.id, t.event_id, t.phone, t.email, t.attendee_name, t.checkout_request_id,
       t.mpesa_receipt, t.payment_status,
       e.title AS event_title, e.event_date
     FROM tickets t
     JOIN events e ON e.id = t.event_id
     WHERE UPPER(t.mpesa_receipt) = $1 AND t.payment_status = 'paid'
     ORDER BY t.created_at ASC`,
    [normalized]
  )
  return result.rows.filter((row) => row.phone && phonesMatch(phone, row.phone))
}

type GateSearchKind = 'phone' | 'receipt' | 'name'

export function classifyGateSearch(term: string): GateSearchKind | null {
  const trimmed = term.trim()
  if (!trimmed) return null
  if (toKenyanMsisdn(trimmed)) return 'phone'
  if (/^[A-Za-z0-9]{8,12}$/.test(trimmed) && /[A-Za-z]/.test(trimmed)) return 'receipt'
  if (trimmed.length >= MIN_NAME_SEARCH_LENGTH) return 'name'
  return null
}

/** Tickets matching a phone number, M-Pesa receipt, or attendee name, for staff at the gate. */
export async function searchTicketsForGate(term: string, eventFilter?: string) {
  const kind = classifyGateSearch(term)
  if (!kind) return []
  const eventId = eventFilter && isUuid(eventFilter) ? eventFilter : undefined

  const trimmed = term.trim()
  const select = `
    SELECT t.*, e.title AS event_title, e.event_date
    FROM tickets t
    LEFT JOIN events e ON t.event_id = e.id`

  if (kind === 'phone') {
    const msisdn = toKenyanMsisdn(trimmed)!
    const local = `0${msisdn.slice(3)}`
    const result = await query(
      `${select}
       WHERE regexp_replace(COALESCE(t.phone, ''), '\\D', '', 'g') IN ($1, $2, $3)
         AND ($4::uuid IS NULL OR t.event_id = $4::uuid)
       ORDER BY t.created_at DESC
       LIMIT ${GATE_SEARCH_LIMIT}`,
      [msisdn, local, msisdn.slice(3), eventId || null]
    )
    return result.rows
  }

  const escaped = trimmed.replace(/[\\%_]/g, (c) => `\\${c}`)

  // Receipt-shaped terms can also be single names (e.g. "Kiprotich"), so match either.
  if (kind === 'receipt') {
    const result = await query(
      `${select}
       WHERE (UPPER(t.mpesa_receipt) = $1 OR t.attendee_name ILIKE $2)
         AND ($3::uuid IS NULL OR t.event_id = $3::uuid)
       ORDER BY t.created_at DESC
       LIMIT ${GATE_SEARCH_LIMIT}`,
      [normalizeReceipt(trimmed), `%${escaped}%`, eventId || null]
    )
    return result.rows
  }

  const result = await query(
    `${select}
     WHERE t.attendee_name ILIKE $1
       AND ($2::uuid IS NULL OR t.event_id = $2::uuid)
     ORDER BY t.created_at DESC
     LIMIT ${GATE_SEARCH_LIMIT}`,
    [`%${escaped}%`, eventId || null]
  )
  return result.rows
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null
  const [local, domain] = email.split('@')
  if (!domain) return null
  return `${local.charAt(0)}***@${domain}`
}
