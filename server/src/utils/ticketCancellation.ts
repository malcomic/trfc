import { query } from '../config/db.js'
import { reverseCaptainCommission } from './captainCommissions.js'
import { sendEmail } from './emailService.js'
import { buildTicketCancelledEmailHTML, buildTicketCancelledEmailText } from './emailTemplates.js'
import { closePlanToCredit } from './installments.js'
import { creditAvailableFrom, getTicketRules, type TicketRules } from './ticketRules.js'
import { addCredit, roundKes, withWallet } from './wallet.js'
import { notifyWaitlist } from './waitlist.js'

const HOUR_MS = 60 * 60 * 1000

export class CancellationError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
    this.name = 'CancellationError'
  }
}

export type NoticeStatus = 'cancelled_early' | 'no_show'

export interface CancellableTicket {
  id: string
  user_id: string | null
  event_id: string
  purchase_batch_id: string | null
  payment_status: string
  checked_in_at: Date | string | null
  price: number
  event_title: string
  event_starts_at: Date | string
  event_day: string
  event_cancelled_at: Date | string | null
  referral_region_id: string | null
  plan_id: string | null
  plan_status: string | null
  plan_amount_paid: number | null
}

export interface CancellationEligibility {
  allowed: boolean
  reason?: string
  /** Ticket value the member gets; for a ticket on an active plan this is everything paid on the plan. */
  creditAmount: number
  /** Cancelling a reserved ticket cancels every ticket on its payment plan. */
  cancelsPlan: boolean
  /** At least `earlyNoticeHours` before the event is "Cancelled early"; later is recorded as a no-show. */
  noticeStatus: NoticeStatus
}

export function evaluateCancellation(
  ticket: CancellableTicket,
  userId: string,
  rules: Pick<TicketRules, 'earlyNoticeHours'>,
  now: Date = new Date()
): CancellationEligibility {
  const onActivePlan = ticket.payment_status === 'reserved' && ticket.plan_status === 'active'
  const creditAmount = roundKes(onActivePlan ? Number(ticket.plan_amount_paid ?? 0) : Number(ticket.price ?? 0))
  const startsAt = new Date(ticket.event_starts_at).getTime()
  const noticeStatus: NoticeStatus =
    onActivePlan || startsAt - now.getTime() >= rules.earlyNoticeHours * HOUR_MS ? 'cancelled_early' : 'no_show'
  const blocked = (reason: string): CancellationEligibility => ({
    allowed: false,
    reason,
    creditAmount,
    cancelsPlan: onActivePlan,
    noticeStatus,
  })

  if (ticket.user_id !== userId) return blocked('Ticket not found')
  if (ticket.payment_status === 'cancelled') return blocked('You have already told us you cannot come')
  if (ticket.event_cancelled_at) return blocked('This event was cancelled by TRFC')
  if (ticket.payment_status === 'reserved' && !onActivePlan) return blocked('This reservation is no longer active')
  if (ticket.payment_status !== 'paid' && ticket.payment_status !== 'reserved') {
    return blocked('Only paid or reserved tickets can be given up')
  }
  if (ticket.checked_in_at) return blocked('This ticket has already been used')
  if (now.getTime() >= startsAt) return blocked('The event has already started')

  return { allowed: true, creditAmount, cancelsPlan: onActivePlan, noticeStatus }
}

const TICKET_SELECT = `
  SELECT t.id, t.user_id, t.event_id, t.purchase_batch_id, t.payment_status, t.checked_in_at, t.referral_region_id,
         COALESCE(t.unit_price, ett.price, e.price, 0)::float AS price,
         e.title AS event_title, (e.event_date AT TIME ZONE 'Africa/Nairobi') AS event_starts_at,
         to_char(e.event_date, 'YYYY-MM-DD') AS event_day, e.cancelled_at AS event_cancelled_at,
         p.id AS plan_id, p.status AS plan_status, p.amount_paid::float AS plan_amount_paid
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  LEFT JOIN event_ticket_types ett ON ett.id = t.ticket_type_id
  LEFT JOIN ticket_payment_plans p ON p.purchase_batch_id = t.purchase_batch_id`

/** Adds `can_cancel`, `cancel_blocked_reason`, `cancel_credit_amount` and `cancel_notice_status` to the member's tickets. */
export async function annotateCancellation<T extends { id: string }>(userId: string, tickets: T[]) {
  if (tickets.length === 0) return []
  const [details, rules] = await Promise.all([query(`${TICKET_SELECT} WHERE t.user_id = $1`, [userId]), getTicketRules()])
  const byId = new Map<string, CancellableTicket>(details.rows.map((row: CancellableTicket) => [row.id, row]))
  const now = new Date()
  return tickets.map((ticket) => {
    const detail = byId.get(ticket.id)
    if (!detail) {
      return { ...ticket, can_cancel: false, cancel_blocked_reason: null, cancel_credit_amount: 0, cancel_notice_status: null }
    }
    const result = evaluateCancellation(detail, userId, rules, now)
    return {
      ...ticket,
      can_cancel: result.allowed,
      cancel_blocked_reason: result.allowed ? null : result.reason ?? null,
      cancel_credit_amount: result.creditAmount,
      cancel_notice_status: result.noticeStatus,
    }
  })
}

export interface CancelTicketResult {
  credited: number
  cancelledTicketIds: string[]
  eventTitle: string
  eventId: string
  noticeStatus: NoticeStatus
  availableFrom: Date | null
  expiresAt: Date | null
}

/**
 * The member tells us they can't come. The ticket value becomes ticket credit either way: with early
 * notice it is usable straight away; with late notice it is recorded as a no-show and the credit appears
 * the morning after the event. Runs under the wallet lock.
 */
export async function cancelTicket(ticketId: string, userId: string): Promise<CancelTicketResult> {
  const rules = await getTicketRules()
  const result = await withWallet(userId, async (client) => {
    const found = await client.query(`${TICKET_SELECT} WHERE t.id = $1 FOR UPDATE OF t`, [ticketId])
    const ticket: CancellableTicket | undefined = found.rows[0]
    if (!ticket || ticket.user_id !== userId) throw new CancellationError('Ticket not found', 404)

    const now = new Date()
    const eligibility = evaluateCancellation(ticket, userId, rules, now)
    if (!eligibility.allowed) throw new CancellationError(eligibility.reason ?? 'This ticket cannot be given up')

    if (eligibility.cancelsPlan && ticket.plan_id) {
      const tickets = await client.query(
        `SELECT id FROM tickets WHERE purchase_batch_id = $1 AND payment_status = 'reserved'`,
        [ticket.purchase_batch_id]
      )
      const closed = await closePlanToCredit(client, ticket.plan_id, 'cancelled_early')
      const ids = tickets.rows.map((row: { id: string }) => row.id)
      await client.query(
        `UPDATE tickets SET attendance_status = 'cancelled_early', cancel_notice_at = NOW() WHERE id = ANY($1::uuid[])`,
        [ids]
      )
      await recordCancellation(client, userId, ticketId, closed?.credited ?? 0)
      return {
        credited: closed?.credited ?? 0,
        cancelledTicketIds: ids,
        eventTitle: ticket.event_title,
        eventId: ticket.event_id,
        noticeStatus: 'cancelled_early' as NoticeStatus,
        availableFrom: closed?.credited ? now : null,
        expiresAt: closed?.expiresAt ?? null,
      }
    }

    await client.query(
      `UPDATE tickets SET payment_status = 'cancelled', cancelled_at = NOW(), attendance_status = $2,
              cancel_notice_at = NOW()
       WHERE id = $1`,
      [ticketId, eligibility.noticeStatus]
    )
    const early = eligibility.noticeStatus === 'cancelled_early'
    const credit = await addCredit(client, userId, {
      amount: eligibility.creditAmount,
      reason: eligibility.noticeStatus,
      eventDay: ticket.event_day,
      availableFrom: early ? now : creditAvailableFrom(ticket.event_day),
      sourceTicketId: ticketId,
      sourceEventId: ticket.event_id,
      regionId: ticket.referral_region_id,
      note: early ? `Cancelled early: ${ticket.event_title}` : `Late notice: ${ticket.event_title}`,
    })
    await recordCancellation(client, userId, ticketId, credit?.amount ?? 0)
    return {
      credited: credit?.amount ?? 0,
      cancelledTicketIds: [ticketId],
      eventTitle: ticket.event_title,
      eventId: ticket.event_id,
      noticeStatus: eligibility.noticeStatus,
      availableFrom: credit?.availableFrom ?? null,
      expiresAt: credit?.expiresAt ?? null,
    }
  })

  for (const id of result.cancelledTicketIds) {
    await reverseCaptainCommission('ticket', id)
  }
  void notifyWaitlist(result.eventId)
  void sendCancellationEmail(userId, result)
  return result
}

async function recordCancellation(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  userId: string,
  ticketId: string,
  credited: number
) {
  await client.query(
    `INSERT INTO ticket_cancellations (user_id, ticket_id, credited_amount) VALUES ($1, $2, $3)
     ON CONFLICT (ticket_id) DO NOTHING`,
    [userId, ticketId, credited]
  )
}

async function sendCancellationEmail(userId: string, result: CancelTicketResult) {
  try {
    const user = await query('SELECT email, name FROM users WHERE id = $1', [userId])
    const row = user.rows[0]
    if (!row?.email) return
    const data = {
      name: row.name ?? null,
      eventTitle: result.eventTitle,
      ticketCount: result.cancelledTicketIds.length,
      credited: result.credited,
      early: result.noticeStatus === 'cancelled_early',
      availableFrom: result.availableFrom,
      expiresAt: result.expiresAt,
    }
    await sendEmail({
      to: row.email,
      subject: `We've noted you can't make it — ${result.eventTitle}`,
      html: buildTicketCancelledEmailHTML(data),
      text: buildTicketCancelledEmailText(data),
    })
  } catch (error) {
    console.error(`Failed to send cancellation email to user ${userId}:`, error)
  }
}
