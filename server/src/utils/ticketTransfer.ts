import type { PoolClient } from 'pg'
import { getClient, query } from '../config/db.js'
import { sendEmail } from './emailService.js'
import {
  buildTicketTransferReceivedEmailHTML,
  buildTicketTransferReceivedEmailText,
  buildTicketTransferSentEmailHTML,
  buildTicketTransferSentEmailText,
} from './emailTemplates.js'
import { perkOn } from './memberPerks.js'
import { isActiveMember } from './seatPriority.js'
import { cancelDeadline, formatNairobiDate, getTicketRules } from './ticketRules.js'

type Queryable = Pick<PoolClient, 'query'>
const poolDb = { query } as unknown as Queryable

export const TRANSFER_PERK = 'ticket_swap'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class TransferError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
    this.name = 'TransferError'
  }
}

export interface TransferableTicket {
  id: string
  user_id: string | null
  payment_status: string
  checked_in_at: Date | string | null
  event_title: string
  event_starts_at: Date | string
  event_day: string
  event_cancelled_at: Date | string | null
  members_only: boolean
  transferred: boolean
}

export interface TransferContext {
  perkOn: boolean
  senderIsMember: boolean
  cancelDeadlineDays: number
}

const TRANSFER_SELECT = `
  SELECT t.id, t.user_id, t.payment_status, t.checked_in_at,
         e.title AS event_title, (e.event_date AT TIME ZONE 'Africa/Nairobi') AS event_starts_at,
         to_char(e.event_date, 'YYYY-MM-DD') AS event_day, e.cancelled_at AS event_cancelled_at,
         COALESCE(ett.members_only, false) AS members_only,
         EXISTS (SELECT 1 FROM ticket_transfers tt WHERE tt.ticket_id = t.id) AS transferred
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  LEFT JOIN event_ticket_types ett ON ett.id = t.ticket_type_id`

/** Whether a member may give this ticket away now; transfers close at the same deadline as cancelling. */
export function evaluateTransfer(
  ticket: TransferableTicket,
  userId: string,
  ctx: TransferContext,
  now: Date = new Date()
): { allowed: boolean; reason?: string } {
  const blocked = (reason: string) => ({ allowed: false, reason })
  if (ticket.user_id !== userId) return blocked('Ticket not found')
  if (!ctx.perkOn) return blocked('Ticket transfer is not available right now')
  if (!ctx.senderIsMember) return blocked('Free ticket transfer is for TRFC members')
  if (ticket.transferred) return blocked('This ticket has already been transferred once')
  if (ticket.payment_status === 'cancelled') return blocked('This ticket was given up')
  if (ticket.payment_status !== 'paid') return blocked('Only fully paid tickets can be transferred')
  if (ticket.checked_in_at) return blocked('This ticket has already been used')
  if (ticket.event_cancelled_at) return blocked('This event was cancelled by TRFC')
  if (now.getTime() >= new Date(ticket.event_starts_at).getTime()) return blocked('The event has already started')
  const deadline = cancelDeadline(ticket.event_day, ctx.cancelDeadlineDays)
  if (now.getTime() > deadline.getTime()) {
    return blocked(`You could transfer this ticket until ${formatNairobiDate(deadline)}, 11:59 pm`)
  }
  return { allowed: true }
}

async function transferContext(db: Queryable, userId: string): Promise<TransferContext> {
  const [on, member, rules] = await Promise.all([perkOn(db, TRANSFER_PERK), isActiveMember(db, userId), getTicketRules()])
  return { perkOn: on, senderIsMember: member, cancelDeadlineDays: rules.cancelDeadlineDays }
}

/** Adds `can_transfer`, `transfer_blocked_reason` and `transferred_from` to the member's tickets. */
export async function annotateTransfer<T extends { id: string }>(userId: string, tickets: T[]) {
  if (tickets.length === 0) return []
  const [ctx, details, received] = await Promise.all([
    transferContext(poolDb, userId),
    query(`${TRANSFER_SELECT} WHERE t.user_id = $1`, [userId]),
    query(
      `SELECT tt.ticket_id, COALESCE(NULLIF(u.name, ''), 'a TRFC member') AS from_name
       FROM ticket_transfers tt
       LEFT JOIN users u ON u.id = tt.from_user_id
       WHERE tt.to_user_id = $1`,
      [userId]
    ),
  ])
  const byId = new Map<string, TransferableTicket>(details.rows.map((row: TransferableTicket) => [row.id, row]))
  const fromById = new Map<string, string>(received.rows.map((row: any) => [row.ticket_id, row.from_name]))
  const now = new Date()
  return tickets.map((ticket) => {
    const detail = byId.get(ticket.id)
    const result = detail ? evaluateTransfer(detail, userId, ctx, now) : { allowed: false, reason: undefined }
    return {
      ...ticket,
      can_transfer: result.allowed,
      transfer_blocked_reason: result.allowed ? null : result.reason ?? null,
      transferred_from: fromById.get(ticket.id) ?? null,
    }
  })
}

export interface TransferResult {
  ticketId: string
  recipientName: string
  eventTitle: string
}

const displayName = (name: string | null | undefined, email: string) =>
  name && name.trim() && name !== 'Guest' ? name.trim() : email.split('@')[0] || 'TRFC member'

/** Gives a paid ticket to another account. One transfer per ticket; members-only tickets need a member. */
export async function transferTicket(ticketId: string, fromUserId: string, recipientEmail: unknown): Promise<TransferResult> {
  const email = typeof recipientEmail === 'string' ? recipientEmail.trim().toLowerCase() : ''
  if (!EMAIL_PATTERN.test(email)) throw new TransferError('Enter the email of the person getting the ticket')

  const client = await getClient()
  let outcome: TransferResult & {
    sender: { name: string | null; email: string | null }
    recipient: { name: string | null; email: string }
    eventDay: string
  }
  try {
    await client.query('BEGIN')
    const found = await client.query(`${TRANSFER_SELECT} WHERE t.id = $1 FOR UPDATE OF t`, [ticketId])
    const ticket: TransferableTicket | undefined = found.rows[0]
    if (!ticket || ticket.user_id !== fromUserId) throw new TransferError('Ticket not found', 404)

    const check = evaluateTransfer(ticket, fromUserId, await transferContext(client, fromUserId))
    if (!check.allowed) throw new TransferError(check.reason ?? 'This ticket cannot be transferred')

    const recipientResult = await client.query('SELECT id, name, email FROM users WHERE LOWER(email) = $1 LIMIT 1', [email])
    const recipient = recipientResult.rows[0]
    if (!recipient) {
      throw new TransferError('No TRFC account uses that email. Ask them to sign up first, then try again.', 404)
    }
    if (recipient.id === fromUserId) throw new TransferError('This ticket is already yours')
    if (ticket.members_only && !(await isActiveMember(client, recipient.id))) {
      throw new TransferError('This is a members-only ticket, so it can only go to a TRFC member')
    }

    const recipientName = displayName(recipient.name, recipient.email)
    await client.query(
      `UPDATE tickets SET user_id = $2, email = $3, attendee_name = $4 WHERE id = $1`,
      [ticketId, recipient.id, String(recipient.email).toLowerCase(), recipientName]
    )
    await client.query(
      `INSERT INTO ticket_transfers (ticket_id, from_user_id, to_user_id) VALUES ($1, $2, $3)`,
      [ticketId, fromUserId, recipient.id]
    )
    const sender = await client.query('SELECT name, email FROM users WHERE id = $1', [fromUserId])
    await client.query('COMMIT')
    outcome = {
      ticketId,
      recipientName,
      eventTitle: ticket.event_title,
      eventDay: ticket.event_day,
      sender: { name: sender.rows[0]?.name ?? null, email: sender.rows[0]?.email ?? null },
      recipient: { name: recipient.name ?? null, email: recipient.email },
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    if ((error as { code?: string })?.code === '23505') {
      throw new TransferError('This ticket has already been transferred once')
    }
    throw error
  } finally {
    client.release()
  }

  void sendTransferEmails(outcome)
  return { ticketId: outcome.ticketId, recipientName: outcome.recipientName, eventTitle: outcome.eventTitle }
}

async function sendTransferEmails(data: {
  eventTitle: string
  eventDay: string
  recipientName: string
  sender: { name: string | null; email: string | null }
  recipient: { name: string | null; email: string }
}) {
  const eventDate = formatNairobiDate(data.eventDay)
  const senderName = data.sender.email ? displayName(data.sender.name, data.sender.email) : 'A TRFC member'
  try {
    if (data.sender.email) {
      const sent = { name: data.sender.name, otherName: data.recipientName, eventTitle: data.eventTitle, eventDate }
      await sendEmail({
        to: data.sender.email,
        subject: `Ticket transferred — ${data.eventTitle}`,
        html: buildTicketTransferSentEmailHTML(sent),
        text: buildTicketTransferSentEmailText(sent),
      })
    }
    const received = { name: data.recipient.name, otherName: senderName, eventTitle: data.eventTitle, eventDate }
    await sendEmail({
      to: data.recipient.email,
      subject: `You have a ticket for ${data.eventTitle}`,
      html: buildTicketTransferReceivedEmailHTML(received),
      text: buildTicketTransferReceivedEmailText(received),
    })
  } catch (error) {
    console.error('Failed to send ticket transfer emails:', error)
  }
}
