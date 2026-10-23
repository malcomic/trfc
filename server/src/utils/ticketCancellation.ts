import { query } from '../config/db.js'
import { reverseCaptainCommission } from './captainCommissions.js'
import { sendEmail } from './emailService.js'
import { buildTicketCancelledEmailHTML, buildTicketCancelledEmailText } from './emailTemplates.js'
import { applyEntry, roundKes, withWallet } from './wallet.js'

export const CANCELLATION_NOTICE_DAYS = 7
export const CANCELLATIONS_PER_MONTH = 1

const DAY_MS = 24 * 60 * 60 * 1000
/** Africa/Nairobi is UTC+3 all year (no daylight saving). */
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000

export class CancellationError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
    this.name = 'CancellationError'
  }
}

export interface CancellableTicket {
  id: string
  user_id: string | null
  purchase_batch_id: string | null
  payment_status: string
  checked_in_at: Date | string | null
  price: number
  event_title: string
  event_date: Date | string
  plan_id: string | null
  plan_status: string | null
  plan_amount_paid: number | null
}

export interface CancellationEligibility {
  allowed: boolean
  reason?: string
  nextAllowedAt?: Date
  /** What would be credited to the wallet; for a ticket on an active plan this is everything paid on the plan. */
  creditAmount: number
  /** Cancelling a reserved ticket cancels every ticket on its installment plan. */
  cancelsPlan: boolean
}

/** Midnight (Nairobi) at the start of the month after `now`, as a UTC instant. */
export function startOfNextNairobiMonth(now: Date): Date {
  const local = new Date(now.getTime() + NAIROBI_OFFSET_MS)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - NAIROBI_OFFSET_MS)
}

export function evaluateCancellation(
  ticket: CancellableTicket,
  userId: string,
  cancellationsThisMonth: number,
  now: Date = new Date()
): CancellationEligibility {
  const onActivePlan = ticket.payment_status === 'reserved' && ticket.plan_status === 'active'
  const creditAmount = roundKes(onActivePlan ? Number(ticket.plan_amount_paid ?? 0) : Number(ticket.price ?? 0))
  const blocked = (reason: string, extra: Partial<CancellationEligibility> = {}): CancellationEligibility => ({
    allowed: false,
    reason,
    creditAmount,
    cancelsPlan: onActivePlan,
    ...extra,
  })

  if (ticket.user_id !== userId) return blocked('Ticket not found')
  if (ticket.payment_status === 'cancelled') return blocked('This ticket has already been cancelled')
  if (ticket.payment_status === 'reserved' && !onActivePlan) {
    return blocked('This reservation is no longer active')
  }
  if (ticket.payment_status !== 'paid' && ticket.payment_status !== 'reserved') {
    return blocked('Only paid or reserved tickets can be cancelled')
  }
  if (ticket.checked_in_at) return blocked('This ticket has already been used')

  const eventTime = new Date(ticket.event_date).getTime()
  if (eventTime - now.getTime() < CANCELLATION_NOTICE_DAYS * DAY_MS) {
    return blocked(`Tickets can only be cancelled at least ${CANCELLATION_NOTICE_DAYS} days before the event`)
  }

  if (cancellationsThisMonth >= CANCELLATIONS_PER_MONTH) {
    const nextAllowedAt = startOfNextNairobiMonth(now)
    const label = nextAllowedAt.toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Africa/Nairobi',
    })
    return blocked(`You can cancel one ticket per month. You can cancel again from ${label}`, { nextAllowedAt })
  }

  return { allowed: true, creditAmount, cancelsPlan: onActivePlan }
}

type Queryable = { query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }> }

const TICKET_SELECT = `
  SELECT t.id, t.user_id, t.purchase_batch_id, t.payment_status, t.checked_in_at,
         COALESCE(t.unit_price, ett.price, e.price, 0)::float AS price,
         e.title AS event_title, e.event_date,
         p.id AS plan_id, p.status AS plan_status, p.amount_paid::float AS plan_amount_paid
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  LEFT JOIN event_ticket_types ett ON ett.id = t.ticket_type_id
  LEFT JOIN ticket_payment_plans p ON p.purchase_batch_id = t.purchase_batch_id`

export async function countCancellationsThisMonth(db: Queryable, userId: string): Promise<number> {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count FROM ticket_cancellations
     WHERE user_id = $1
       AND created_at >= (date_trunc('month', NOW() AT TIME ZONE 'Africa/Nairobi') AT TIME ZONE 'Africa/Nairobi')`,
    [userId]
  )
  return Number(result.rows[0]?.count ?? 0)
}

/** Adds `can_cancel`, `cancel_blocked_reason` and `cancel_credit_amount` to the member's own ticket rows. */
export async function annotateCancellation<T extends { id: string }>(userId: string, tickets: T[]) {
  if (tickets.length === 0) return []
  const [details, monthly] = await Promise.all([
    query(`${TICKET_SELECT} WHERE t.user_id = $1`, [userId]),
    countCancellationsThisMonth({ query }, userId),
  ])
  const byId = new Map<string, CancellableTicket>(details.rows.map((row: CancellableTicket) => [row.id, row]))
  const now = new Date()
  return tickets.map((ticket) => {
    const detail = byId.get(ticket.id)
    if (!detail) {
      return { ...ticket, can_cancel: false, cancel_blocked_reason: null, cancel_credit_amount: 0 }
    }
    const result = evaluateCancellation(detail, userId, monthly, now)
    return {
      ...ticket,
      can_cancel: result.allowed,
      cancel_blocked_reason: result.allowed ? null : result.reason ?? null,
      cancel_credit_amount: result.creditAmount,
    }
  })
}

export interface CancelTicketResult {
  credited: number
  balance: number
  cancelledTicketIds: string[]
  eventTitle: string
}

/**
 * Cancels a member's ticket with no refund: the value is credited to their wallet instead.
 * Runs under the wallet lock, so two cancellations can't both slip under the monthly limit.
 */
export async function cancelTicket(ticketId: string, userId: string): Promise<CancelTicketResult> {
  const result = await withWallet(userId, async (client, wallet) => {
    const found = await client.query(`${TICKET_SELECT} WHERE t.id = $1 FOR UPDATE OF t`, [ticketId])
    const ticket: CancellableTicket | undefined = found.rows[0]
    if (!ticket || ticket.user_id !== userId) throw new CancellationError('Ticket not found', 404)

    if (ticket.plan_id) {
      await client.query('SELECT id FROM ticket_payment_plans WHERE id = $1 FOR UPDATE', [ticket.plan_id])
    }

    const monthly = await countCancellationsThisMonth(client, userId)
    const eligibility = evaluateCancellation(ticket, userId, monthly)
    if (!eligibility.allowed) throw new CancellationError(eligibility.reason ?? 'This ticket cannot be cancelled')

    let cancelledTicketIds: string[]
    if (eligibility.cancelsPlan) {
      const cancelled = await client.query(
        `UPDATE tickets SET payment_status = 'cancelled', cancelled_at = NOW()
         WHERE purchase_batch_id = $1 AND user_id = $2 AND payment_status = 'reserved'
         RETURNING id`,
        [ticket.purchase_batch_id, userId]
      )
      cancelledTicketIds = cancelled.rows.map((row: { id: string }) => row.id)
      await client.query(`UPDATE ticket_payment_plans SET status = 'cancelled' WHERE id = $1`, [ticket.plan_id])
    } else {
      await client.query(`UPDATE tickets SET payment_status = 'cancelled', cancelled_at = NOW() WHERE id = $1`, [
        ticketId,
      ])
      cancelledTicketIds = [ticketId]
    }

    let balance = wallet.balance
    let walletTxId: string | null = null
    if (eligibility.creditAmount > 0) {
      const what = cancelledTicketIds.length > 1 ? `${cancelledTicketIds.length} tickets` : 'ticket'
      const tx = await applyEntry(client, userId, {
        type: 'cancellation_credit',
        amount: eligibility.creditAmount,
        referenceType: eligibility.cancelsPlan ? 'payment_plan' : 'ticket',
        referenceId: eligibility.cancelsPlan ? ticket.plan_id : ticketId,
        note: `Cancelled ${what}: ${ticket.event_title}`,
      })
      balance = Number(tx.balance_after ?? balance)
      walletTxId = tx.id
    }

    await client.query(
      `INSERT INTO ticket_cancellations (user_id, ticket_id, credited_amount, wallet_transaction_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, ticketId, eligibility.creditAmount, walletTxId]
    )

    return { credited: eligibility.creditAmount, balance, cancelledTicketIds, eventTitle: ticket.event_title }
  })

  for (const id of result.cancelledTicketIds) {
    await reverseCaptainCommission('ticket', id)
  }
  void sendCancellationEmail(userId, result)
  return result
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
      balance: result.balance,
    }
    await sendEmail({
      to: row.email,
      subject: `Ticket cancelled — ${result.eventTitle}`,
      html: buildTicketCancelledEmailHTML(data),
      text: buildTicketCancelledEmailText(data),
    })
  } catch (error) {
    console.error(`Failed to send cancellation email to user ${userId}:`, error)
  }
}
