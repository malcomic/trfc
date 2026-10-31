import type { PoolClient } from 'pg'
import { query } from '../config/db.js'
import { recordCaptainCommissionsForCheckout } from './captainCommissions.js'
import { reportMetaPurchase } from './metaConversions.js'
import { sendTicketBatchEmail } from './ticketEmail.js'
import { depositFor, formatNairobiDate, getTicketRules, planDeadline } from './ticketRules.js'
import { addCredit, commitHolds, createPendingMpesaTx, holdCredit, roundKes, withWallet } from './wallet.js'
import { startMpesaForTx } from './walletMpesa.js'
import { payBatchesWithCredit, type CreditCheckoutResult } from './walletCheckout.js'

/** The member picks up to this many dates for the payments after the first one. */
export const MAX_LATER_PAYMENTS = 4
/** An M-Pesa prompt older than this is treated as abandoned, so the member can try again. */
const MPESA_IN_FLIGHT_MS = 5 * 60 * 1000

export class InstallmentError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
    this.name = 'InstallmentError'
  }
}

export interface ScheduleItem {
  seq: number
  amount: number
  due_at: Date
}

export interface PlanTerms {
  total: number
  deposit: number
  deadline: Date
  schedule: ScheduleItem[]
}

/**
 * Paying in parts: the first payment is `depositPct`% rounded up to the next `roundTo` shillings and is
 * due now; the rest is split evenly over the dates the member picks, each on or before the deadline
 * (end of the day `deadlineDays` before the event). With no dates picked, the rest is due at the deadline.
 */
export function buildSchedule(
  total: number,
  opts: {
    eventDay: string
    deadlineDays: number
    depositPct: number
    roundTo: number
    dates?: Date[]
    now?: Date
  }
): PlanTerms {
  const now = opts.now ?? new Date()
  if (!Number.isFinite(total) || total <= 0) {
    throw new InstallmentError('Paying in parts is only available for paid tickets')
  }
  const deadline = planDeadline(opts.eventDay, opts.deadlineDays)
  if (deadline.getTime() <= now.getTime()) {
    throw new InstallmentError(
      `Paying in parts for this event closed on ${formatNairobiDate(deadline)}. Pay the full price instead.`
    )
  }
  const deposit = depositFor(total, opts.depositPct, opts.roundTo)
  const rest = roundKes(total - deposit)
  const schedule: ScheduleItem[] = [{ seq: 1, amount: deposit, due_at: now }]
  if (rest <= 0) return { total, deposit, deadline, schedule }

  const picked = [...new Map((opts.dates ?? []).map((d) => [d.getTime(), d])).values()].sort(
    (a, b) => a.getTime() - b.getTime()
  )
  if (picked.length > MAX_LATER_PAYMENTS) {
    throw new InstallmentError(`Pick at most ${MAX_LATER_PAYMENTS} dates for the remaining payments`)
  }
  for (const date of picked) {
    if (!Number.isFinite(date.getTime()) || date.getTime() <= now.getTime()) {
      throw new InstallmentError('Payment dates must be in the future')
    }
    if (date.getTime() > deadline.getTime()) {
      throw new InstallmentError(`Every payment must be made by ${formatNairobiDate(deadline)}`)
    }
  }
  const dates = picked.length > 0 ? picked : [deadline]
  const part = Math.floor(rest / dates.length)
  dates.forEach((due_at, i) => {
    const isLast = i === dates.length - 1
    schedule.push({ seq: i + 2, amount: isLast ? roundKes(rest - part * (dates.length - 1)) : part, due_at })
  })
  return { total, deposit, deadline, schedule }
}

/** The Nairobi calendar day and deadline setting of an event, for building a schedule. */
export async function getEventPlanSettings(db: Pick<PoolClient, 'query'>, eventId: string) {
  const result = await db.query(
    `SELECT to_char(event_date, 'YYYY-MM-DD') AS event_day, installments_allowed, payment_deadline_days,
            cancelled_at, is_active
     FROM events WHERE id = $1`,
    [eventId]
  )
  const row = result.rows[0]
  if (!row) return null
  const rules = await getTicketRules()
  return {
    eventDay: String(row.event_day),
    enabled: Number(row.installments_allowed ?? 0) > 0 && !row.cancelled_at && row.is_active !== false,
    deadlineDays: row.payment_deadline_days != null ? Number(row.payment_deadline_days) : rules.defaultDeadlineDays,
    depositPct: rules.depositPct,
    roundTo: rules.depositRoundTo,
  }
}

const PLAN_SELECT = `
  SELECT p.id, p.user_id, p.purchase_batch_id, p.event_id, p.total_amount::float AS total_amount,
         p.amount_paid::float AS amount_paid, p.deposit_amount::float AS deposit_amount, p.deadline_at,
         p.installment_count, p.status, p.created_at, p.completed_at,
         e.title AS event_title, e.event_date, e.location,
         (SELECT COUNT(*)::int FROM tickets t WHERE t.purchase_batch_id = p.purchase_batch_id) AS quantity,
         EXISTS (
           SELECT 1 FROM wallet_transactions w
           WHERE w.reference_type = 'payment_plan' AND w.reference_id = p.id AND w.type = 'installment'
             AND w.status = 'pending' AND w.created_at > NOW() - INTERVAL '${MPESA_IN_FLIGHT_MS / 1000} seconds'
         ) AS payment_in_progress,
         COALESCE((
           SELECT json_agg(json_build_object(
                    'id', i.id, 'seq', i.seq, 'amount', i.amount::float, 'due_at', i.due_at, 'paid_at', i.paid_at)
                  ORDER BY i.seq)
           FROM ticket_plan_installments i WHERE i.plan_id = p.id
         ), '[]'::json) AS installments
  FROM ticket_payment_plans p
  JOIN events e ON e.id = p.event_id`

export interface PlanInstallment {
  id: string
  seq: number
  amount: number
  due_at: string
  paid_at: string | null
}

export interface PaymentPlan {
  id: string
  user_id: string
  purchase_batch_id: string
  event_id: string
  total_amount: number
  amount_paid: number
  deposit_amount: number | null
  deadline_at: string | null
  installment_count: number
  status: 'active' | 'completed' | 'cancelled' | 'expired' | 'moved'
  created_at: string
  completed_at: string | null
  event_title: string
  event_date: string
  location: string | null
  quantity: number
  payment_in_progress: boolean
  installments: PlanInstallment[]
}

export async function getPlan(planId: string): Promise<PaymentPlan | null> {
  const result = await query(`${PLAN_SELECT} WHERE p.id = $1`, [planId])
  return result.rows[0] ?? null
}

export async function getPlansForUser(userId: string): Promise<PaymentPlan[]> {
  const result = await query(
    `${PLAN_SELECT} WHERE p.user_id = $1
     ORDER BY (p.status = 'active') DESC, e.event_date ASC, p.created_at DESC`,
    [userId]
  )
  return result.rows
}

/** Turns a pending ticket booking into a plan, holding the tickets as `reserved` until fully paid. */
export async function createPlan(userId: string, batchId: string, dates: Date[]): Promise<PaymentPlan> {
  const planId = await withWallet(userId, async (client) => {
    const rows = (
      await client.query(
        `SELECT t.id, t.user_id, t.event_id, t.payment_status, t.checkout_request_id,
                COALESCE(t.unit_price, ett.price, e.price, 0)::float AS price, e.title AS event_title
         FROM tickets t
         JOIN events e ON e.id = t.event_id
         LEFT JOIN event_ticket_types ett ON ett.id = t.ticket_type_id
         WHERE t.purchase_batch_id = $1
         FOR UPDATE OF t`,
        [batchId]
      )
    ).rows
    if (rows.length === 0 || rows.some((r) => r.user_id !== userId)) {
      throw new InstallmentError('Booking not found', 404)
    }
    if (rows.some((r) => r.payment_status !== 'pending' || r.checkout_request_id)) {
      throw new InstallmentError('This booking is no longer awaiting payment', 409)
    }
    const settings = await getEventPlanSettings(client, rows[0].event_id)
    if (!settings?.enabled) throw new InstallmentError(`${rows[0].event_title} can't be paid in parts`)

    const total = roundKes(rows.reduce((sum, r) => sum + Number(r.price || 0), 0))
    const terms = buildSchedule(total, { ...settings, dates })

    const plan = await client.query(
      `INSERT INTO ticket_payment_plans
         (user_id, purchase_batch_id, event_id, total_amount, installment_count, deposit_amount, deadline_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [userId, batchId, rows[0].event_id, total, terms.schedule.length, terms.deposit, terms.deadline]
    )
    const id: string = plan.rows[0].id
    for (const item of terms.schedule) {
      await client.query(
        `INSERT INTO ticket_plan_installments (plan_id, seq, amount, due_at) VALUES ($1, $2, $3, $4)`,
        [id, item.seq, item.amount, item.due_at]
      )
    }
    await client.query(
      `UPDATE tickets SET payment_status = 'reserved', payment_provider = 'installments'
       WHERE purchase_batch_id = $1`,
      [batchId]
    )
    return id
  })
  return (await getPlan(planId))!
}

/** Marks every installment whose running total is covered by what has been paid. */
async function markCoveredInstallments(client: Pick<PoolClient, 'query'>, planId: string, txId: string | null) {
  await client.query(
    `UPDATE ticket_plan_installments i SET paid_at = NOW(), wallet_transaction_id = COALESCE(i.wallet_transaction_id, $2)
     FROM (
       SELECT id, SUM(amount) OVER (ORDER BY seq) AS running FROM ticket_plan_installments WHERE plan_id = $1
     ) c, ticket_payment_plans p
     WHERE i.id = c.id AND p.id = $1 AND i.paid_at IS NULL AND c.running <= p.amount_paid + 0.005`,
    [planId, txId]
  )
}

/**
 * If the plan is fully paid, issues its tickets under the reference `PLAN-<planId>`.
 * Must run inside the transaction that recorded the final payment; returns the reference when it completed.
 */
export async function completePlanIfPaid(client: Pick<PoolClient, 'query'>, planId: string): Promise<string | null> {
  const plan = await client.query(
    `SELECT purchase_batch_id, status, amount_paid::float AS amount_paid, total_amount::float AS total_amount
     FROM ticket_payment_plans WHERE id = $1`,
    [planId]
  )
  const row = plan.rows[0]
  if (!row || row.status !== 'active' || row.amount_paid + 0.005 < row.total_amount) return null

  const reference = `PLAN-${planId}`
  await client.query(`UPDATE ticket_payment_plans SET status = 'completed', completed_at = NOW() WHERE id = $1`, [
    planId,
  ])
  await client.query(
    `UPDATE tickets SET payment_status = 'paid', checkout_request_id = $2
     WHERE purchase_batch_id = $1 AND payment_status = 'reserved'`,
    [row.purchase_batch_id, reference]
  )
  return reference
}

/** Post-commit side effects once a plan's tickets are issued. */
export async function afterPlanCompleted(reference: string) {
  await recordCaptainCommissionsForCheckout(reference)
  reportMetaPurchase(reference)
  sendTicketBatchEmail(reference).catch((error: Error) => {
    console.error(`Error sending ticket email for ${reference}: ${error.message}`)
  })
}

async function lockActivePlan(client: Pick<PoolClient, 'query'>, planId: string, userId: string) {
  const plan = await client.query(
    `SELECT p.id, p.user_id, p.status, p.deadline_at, p.total_amount::float AS total_amount,
            p.amount_paid::float AS amount_paid, e.title AS event_title
     FROM ticket_payment_plans p JOIN events e ON e.id = p.event_id
     WHERE p.id = $1 FOR UPDATE OF p`,
    [planId]
  )
  const row = plan.rows[0]
  if (!row || row.user_id !== userId) throw new InstallmentError('Payment plan not found', 404)
  if (row.status !== 'active') throw new InstallmentError('This payment plan is no longer active', 409)
  if (row.deadline_at && new Date(row.deadline_at).getTime() < Date.now()) {
    throw new InstallmentError('The payment deadline for this ticket has passed', 409)
  }
  return row as { id: string; event_title: string; total_amount: number; amount_paid: number }
}

/** What is due now: up to the end of the next unpaid installment ('next'), or everything left ('all'). */
async function amountDue(
  client: Pick<PoolClient, 'query'>,
  plan: { id: string; total_amount: number; amount_paid: number },
  mode: 'next' | 'all'
): Promise<number> {
  const left = roundKes(plan.total_amount - plan.amount_paid)
  if (mode === 'all') return left
  const next = await client.query(
    `SELECT running::float AS running FROM (
       SELECT seq, paid_at, SUM(amount) OVER (ORDER BY seq) AS running FROM ticket_plan_installments WHERE plan_id = $1
     ) c WHERE paid_at IS NULL ORDER BY seq LIMIT 1`,
    [plan.id]
  )
  const running = Number(next.rows[0]?.running ?? plan.total_amount)
  return Math.min(left, roundKes(running - plan.amount_paid))
}

async function assertNoPaymentInFlight(client: Pick<PoolClient, 'query'>, planId: string) {
  const inFlight = await client.query(
    `SELECT 1 FROM wallet_transactions
     WHERE reference_type = 'payment_plan' AND reference_id = $1 AND type = 'installment' AND status = 'pending'
       AND created_at > NOW() - make_interval(secs => $2)
     LIMIT 1`,
    [planId, MPESA_IN_FLIGHT_MS / 1000]
  )
  if (inFlight.rows.length > 0) {
    throw new InstallmentError('An M-Pesa payment for this ticket is already in progress. Please wait a moment.', 409)
  }
}

async function applyToPlan(client: Pick<PoolClient, 'query'>, planId: string, amount: number, txId: string | null) {
  await client.query(`UPDATE ticket_payment_plans SET amount_paid = amount_paid + $2 WHERE id = $1`, [
    planId,
    roundKes(amount),
  ])
  await markCoveredInstallments(client, planId, txId)
  return completePlanIfPaid(client, planId)
}

export type PayPlanResult =
  | { source: 'credit'; plan: PaymentPlan; amount: number; completed: boolean; reference: string | null }
  | { source: 'mpesa'; checkoutRequestId: string; customerMessage?: string; amount: number }

export async function payPlanInstallments(
  planId: string,
  userId: string,
  opts: { mode: 'next' | 'all'; source: 'credit' | 'mpesa'; phone?: string | null }
): Promise<PayPlanResult> {
  if (opts.source === 'credit') {
    const outcome = await withWallet(userId, async (client) => {
      const plan = await lockActivePlan(client, planId, userId)
      await assertNoPaymentInFlight(client, planId)
      const due = await amountDue(client, plan, opts.mode)
      if (due <= 0) throw new InstallmentError('This ticket is already fully paid', 409)
      const hold = await holdCredit(client, userId, { maxAmount: due, planId })
      if (hold.held <= 0) throw new InstallmentError('You have no ticket value to use right now')
      const spent = await commitHolds(client, userId, { planId }, {
        note: `Payment for ${plan.event_title}`,
        referenceType: 'payment_plan',
        referenceId: planId,
      })
      const reference = await applyToPlan(client, planId, spent.amount, spent.txId)
      return { amount: spent.amount, reference }
    })
    if (outcome.reference) await afterPlanCompleted(outcome.reference)
    return {
      source: 'credit',
      plan: (await getPlan(planId))!,
      amount: outcome.amount,
      completed: Boolean(outcome.reference),
      reference: outcome.reference,
    }
  }

  if (!opts.phone) throw new InstallmentError('Enter a valid M-Pesa number')
  const prepared = await withWallet(userId, async (client) => {
    const plan = await lockActivePlan(client, planId, userId)
    await assertNoPaymentInFlight(client, planId)
    const due = await amountDue(client, plan, opts.mode)
    if (due <= 0) throw new InstallmentError('This ticket is already fully paid', 409)
    const txId = await createPendingMpesaTx(client, userId, {
      type: 'installment',
      mpesaAmount: due,
      phone: opts.phone!,
      referenceType: 'payment_plan',
      referenceId: planId,
      note: `Payment for ${plan.event_title}`,
    })
    return { txId, due }
  })

  const stk = await startMpesaForTx(prepared.txId, opts.phone, prepared.due, `PLAN-${planId}`)
  return { source: 'mpesa', ...stk, amount: prepared.due }
}

/**
 * Settles a plan payment made by M-Pesa. The history row keeps amount 0 (the money never becomes
 * ticket value) with `mpesa_amount` set. Anything paid beyond what the plan still needed, or paid after
 * the plan closed, becomes ticket credit so nothing is lost.
 */
export async function applyInstallmentPaymentByCheckoutId(
  checkoutRequestId: string,
  mpesaReceipt: string | null
): Promise<number> {
  const pending = await query(
    `SELECT id, user_id, reference_id FROM wallet_transactions
     WHERE checkout_request_id = $1 AND type = 'installment' AND status = 'pending'`,
    [checkoutRequestId]
  )
  let settled = 0
  for (const row of pending.rows) {
    const outcome = await withWallet(row.user_id, async (client) => {
      const tx = await client.query(
        `SELECT mpesa_amount::float AS mpesa_amount FROM wallet_transactions
         WHERE id = $1 AND status = 'pending' FOR UPDATE`,
        [row.id]
      )
      if (tx.rows.length === 0) return null as { reference: string | null } | null
      const paid = Number(tx.rows[0].mpesa_amount ?? 0)

      const plan = await client.query(
        `SELECT p.status, p.event_id, p.total_amount::float AS total_amount, p.amount_paid::float AS amount_paid,
                to_char(e.event_date, 'YYYY-MM-DD') AS event_day, e.title AS event_title
         FROM ticket_payment_plans p JOIN events e ON e.id = p.event_id
         WHERE p.id = $1 FOR UPDATE OF p`,
        [row.reference_id]
      )
      const planRow = plan.rows[0]
      const needed = planRow?.status === 'active' ? Math.max(0, roundKes(planRow.total_amount - planRow.amount_paid)) : 0
      const applied = Math.min(paid, needed)

      await client.query(
        `UPDATE wallet_transactions SET status = 'completed', mpesa_receipt = COALESCE($2, mpesa_receipt) WHERE id = $1`,
        [row.id, mpesaReceipt]
      )
      const reference = applied > 0 ? await applyToPlan(client, row.reference_id, applied, row.id) : null

      const leftover = roundKes(paid - applied)
      if (leftover > 0) {
        await addCredit(client, row.user_id, {
          amount: leftover,
          reason: 'late_payment',
          eventDay: planRow?.event_day ?? null,
          sourcePlanId: row.reference_id,
          sourceEventId: planRow?.event_id ?? null,
          note: planRow
            ? `Payment received after the ticket for ${planRow.event_title} was closed`
            : 'Payment received after the ticket was closed',
        })
      }
      return { reference }
    })
    if (!outcome) continue
    settled++
    if (outcome.reference) await afterPlanCompleted(outcome.reference)
  }
  return settled
}

export interface ClosedPlan {
  planId: string
  userId: string
  eventTitle: string
  eventId: string
  credited: number
  expiresAt: Date | null
}

export type PlanCloseReason = 'missed_deadline' | 'cancelled_early' | 'event_cancelled' | 'moved'

/**
 * Releases an unfinished plan's reserved tickets and turns what was paid into ticket credit, usable now
 * and valid until `creditDays` after the event. Must run inside `withWallet` for the plan's owner.
 */
export async function closePlanToCredit(
  client: Pick<PoolClient, 'query'>,
  planId: string,
  reason: PlanCloseReason
): Promise<ClosedPlan | null> {
  const plan = await client.query(
    `SELECT p.user_id, p.event_id, p.purchase_batch_id, p.status, p.amount_paid::float AS amount_paid,
            e.title AS event_title, to_char(e.event_date, 'YYYY-MM-DD') AS event_day
     FROM ticket_payment_plans p JOIN events e ON e.id = p.event_id
     WHERE p.id = $1 FOR UPDATE OF p`,
    [planId]
  )
  const row = plan.rows[0]
  if (!row || row.status !== 'active') return null

  await client.query(`UPDATE ticket_payment_plans SET status = $2 WHERE id = $1`, [
    planId,
    reason === 'missed_deadline' ? 'expired' : reason === 'moved' ? 'moved' : 'cancelled',
  ])
  const released = await client.query(
    `UPDATE tickets SET payment_status = 'cancelled', cancelled_at = NOW()
     WHERE purchase_batch_id = $1 AND payment_status = 'reserved'
     RETURNING referral_region_id`,
    [row.purchase_batch_id]
  )

  const credit = await addCredit(client, row.user_id, {
    amount: Number(row.amount_paid ?? 0),
    reason,
    eventDay: row.event_day,
    sourcePlanId: planId,
    sourceEventId: row.event_id,
    regionId: released.rows.find((r: { referral_region_id: string | null }) => r.referral_region_id)?.referral_region_id ?? null,
    note:
      reason === 'missed_deadline'
        ? `Not fully paid by the deadline: ${row.event_title}`
        : reason === 'event_cancelled'
          ? `Event cancelled by TRFC: ${row.event_title}`
          : reason === 'moved'
            ? `Moved from ${row.event_title} to another event`
            : `Cancelled before the deadline: ${row.event_title}`,
  })
  return {
    planId,
    userId: row.user_id,
    eventTitle: row.event_title,
    eventId: row.event_id,
    credited: credit?.amount ?? 0,
    expiresAt: credit?.expiresAt ?? null,
  }
}

/** Closes a plan whose deadline passed (or whose first payment never arrived). */
export async function expirePlan(planId: string): Promise<ClosedPlan | null> {
  const owner = await query('SELECT user_id FROM ticket_payment_plans WHERE id = $1', [planId])
  const userId: string | undefined = owner.rows[0]?.user_id
  if (!userId) return null
  return withWallet(userId, (client) => closePlanToCredit(client, planId, 'missed_deadline'))
}

/**
 * The member can't make it, or wants to use what they paid on another event without waiting for the
 * deadline: what they paid becomes ticket credit straight away.
 */
export async function releasePlanToCredit(planId: string, userId: string): Promise<ClosedPlan> {
  const closed = await withWallet(userId, async (client) => {
    await lockActivePlan(client, planId, userId)
    await assertNoPaymentInFlight(client, planId)
    return closePlanToCredit(client, planId, 'cancelled_early')
  })
  if (!closed) throw new InstallmentError('This payment plan is no longer active', 409)
  return closed
}

export type MovePlanResult = CreditCheckoutResult & { moved: number; fromEvent: string }

/**
 * Moves a part-paid ticket to another event: the old seat is released, what was paid becomes ticket credit
 * usable straight away, and that credit (oldest first) pays the new booking. Any difference is paid by M-Pesa.
 * If the M-Pesa step fails, the credit stays on the member's account and the new booking can be paid later.
 */
export async function movePlanToEvent(
  planId: string,
  userId: string,
  opts: { purchaseBatchId: string; phone?: string | null }
): Promise<MovePlanResult> {
  const closed = await withWallet(userId, async (client) => {
    await lockActivePlan(client, planId, userId)
    await assertNoPaymentInFlight(client, planId)
    const plan = await client.query('SELECT event_id FROM ticket_payment_plans WHERE id = $1', [planId])
    const target = await client.query(
      `SELECT t.user_id, t.event_id, t.payment_status, t.checkout_request_id, e.cancelled_at,
              (e.event_date >= CURRENT_DATE) AS upcoming
       FROM tickets t JOIN events e ON e.id = t.event_id
       WHERE t.purchase_batch_id = $1`,
      [opts.purchaseBatchId]
    )
    const rows = target.rows
    if (rows.length === 0 || rows.some((r) => r.user_id !== userId)) {
      throw new InstallmentError('New booking not found', 404)
    }
    if (rows[0].event_id === plan.rows[0]?.event_id) {
      throw new InstallmentError('Choose a different event to move to')
    }
    if (rows.some((r) => r.payment_status !== 'pending' || r.checkout_request_id)) {
      throw new InstallmentError('The new booking is no longer awaiting payment', 409)
    }
    if (!rows[0].upcoming || rows[0].cancelled_at) {
      throw new InstallmentError('The new event is no longer open for booking', 409)
    }
    const result = await closePlanToCredit(client, planId, 'moved')
    if (!result) throw new InstallmentError('This payment plan is no longer active', 409)
    return result
  })

  const paid = await payBatchesWithCredit(userId, {
    batchIds: [opts.purchaseBatchId],
    useCredit: true,
    phone: opts.phone ?? null,
  })
  return { ...paid, moved: closed.credited, fromEvent: closed.eventTitle }
}
