import type { PoolClient } from 'pg'
import { query } from '../config/db.js'
import { recordCaptainCommissionsForCheckout } from './captainCommissions.js'
import { reportMetaPurchase } from './metaConversions.js'
import { sendTicketBatchEmail } from './ticketEmail.js'
import { applyEntry, createPendingMpesaTx, roundKes, withWallet } from './wallet.js'
import { startMpesaForTx } from './walletMpesa.js'

export const INSTALLMENT_COUNTS = [2, 3] as const
export const MIN_DAYS_PER_INSTALLMENT = 7

const DAY_MS = 24 * 60 * 60 * 1000
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000
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

/** Midnight (Nairobi) at the start of the day `date` falls on, as a UTC instant. */
export function startOfNairobiDay(date: Date): Date {
  const local = new Date(date.getTime() + NAIROBI_OFFSET_MS)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - NAIROBI_OFFSET_MS)
}

/**
 * Splits `total` into `count` whole-shilling parts (any remainder goes on the last one).
 * The first part is due now and the last at the start of event day, with the rest evenly spaced.
 */
export function buildSchedule(total: number, count: number, eventDate: Date, now: Date = new Date()): ScheduleItem[] {
  if (!INSTALLMENT_COUNTS.includes(count as 2 | 3)) {
    throw new InstallmentError('Choose 2 or 3 installments')
  }
  if (!Number.isFinite(total) || total <= 0) {
    throw new InstallmentError('Installments are only available for paid tickets')
  }
  const part = Math.floor(total / count)
  if (part < 1) throw new InstallmentError('This booking is too small to split into installments')

  const lastDue = startOfNairobiDay(eventDate)
  const span = lastDue.getTime() - now.getTime()
  const minDays = count * MIN_DAYS_PER_INSTALLMENT
  if (span < minDays * DAY_MS) {
    throw new InstallmentError(`Paying in ${count} installments needs the event to be at least ${minDays} days away`)
  }

  return Array.from({ length: count }, (_, i) => {
    const isLast = i === count - 1
    return {
      seq: i + 1,
      amount: isLast ? roundKes(total - part * (count - 1)) : part,
      due_at: isLast ? lastDue : new Date(now.getTime() + Math.round((span * i) / (count - 1))),
    }
  })
}

const PLAN_SELECT = `
  SELECT p.id, p.user_id, p.purchase_batch_id, p.event_id, p.total_amount::float AS total_amount,
         p.amount_paid::float AS amount_paid, p.installment_count, p.status, p.created_at, p.completed_at,
         e.title AS event_title, e.event_date, e.location,
         (SELECT COUNT(*)::int FROM tickets t WHERE t.purchase_batch_id = p.purchase_batch_id) AS quantity,
         COALESCE((
           SELECT json_agg(json_build_object(
                    'id', i.id, 'seq', i.seq, 'amount', i.amount::float, 'due_at', i.due_at, 'paid_at', i.paid_at,
                    'in_progress', i.paid_at IS NULL AND EXISTS (
                      SELECT 1 FROM wallet_transactions w
                      WHERE w.checkout_request_id = i.checkout_request_id AND w.status = 'pending'
                        AND w.created_at > NOW() - INTERVAL '${MPESA_IN_FLIGHT_MS / 1000} seconds'))
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
  in_progress: boolean
}

export interface PaymentPlan {
  id: string
  user_id: string
  purchase_batch_id: string
  event_id: string
  total_amount: number
  amount_paid: number
  installment_count: number
  status: 'active' | 'completed' | 'cancelled' | 'expired'
  created_at: string
  completed_at: string | null
  event_title: string
  event_date: string
  location: string | null
  quantity: number
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

/** Turns a pending ticket booking into an installment plan, holding the tickets as `reserved`. */
export async function createPlan(userId: string, batchId: string, count: number): Promise<PaymentPlan> {
  const planId = await withWallet(userId, async (client) => {
    const rows = (
      await client.query(
        `SELECT t.id, t.user_id, t.event_id, t.payment_status, t.checkout_request_id,
                COALESCE(t.unit_price, ett.price, e.price, 0)::float AS price,
                e.title AS event_title, e.event_date, e.installments_allowed
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
    if (Number(rows[0].installments_allowed ?? 0) < count) {
      throw new InstallmentError(`${rows[0].event_title} can't be paid in ${count} installments`)
    }

    const total = roundKes(rows.reduce((sum, r) => sum + Number(r.price || 0), 0))
    const schedule = buildSchedule(total, count, new Date(rows[0].event_date))

    const plan = await client.query(
      `INSERT INTO ticket_payment_plans (user_id, purchase_batch_id, event_id, total_amount, installment_count)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, batchId, rows[0].event_id, total, count]
    )
    const id: string = plan.rows[0].id
    for (const item of schedule) {
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

/**
 * If the plan is fully paid, issues its tickets under the reference `PLAN-<planId>`.
 * Must run inside the transaction that recorded the final payment; returns the reference when it completed.
 */
export async function completePlanIfPaid(client: PoolClient, planId: string): Promise<string | null> {
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

type UnpaidInstallment = { id: string; seq: number; amount: number }

async function lockActivePlan(client: PoolClient, planId: string, userId: string) {
  const plan = await client.query(
    `SELECT p.id, p.user_id, p.status, e.title AS event_title
     FROM ticket_payment_plans p JOIN events e ON e.id = p.event_id
     WHERE p.id = $1 FOR UPDATE OF p`,
    [planId]
  )
  const row = plan.rows[0]
  if (!row || row.user_id !== userId) throw new InstallmentError('Installment plan not found', 404)
  if (row.status !== 'active') throw new InstallmentError('This installment plan is no longer active', 409)
  return row as { id: string; event_title: string }
}

async function unpaidInstallments(client: PoolClient, planId: string): Promise<UnpaidInstallment[]> {
  const result = await client.query(
    `SELECT id, seq, amount::float AS amount FROM ticket_plan_installments
     WHERE plan_id = $1 AND paid_at IS NULL ORDER BY seq`,
    [planId]
  )
  return result.rows
}

async function assertNoPaymentInFlight(client: PoolClient, planId: string) {
  const inFlight = await client.query(
    `SELECT 1 FROM ticket_plan_installments i
     JOIN wallet_transactions w ON w.checkout_request_id = i.checkout_request_id
     WHERE i.plan_id = $1 AND i.paid_at IS NULL AND w.status = 'pending'
       AND w.created_at > NOW() - make_interval(secs => $2)
     LIMIT 1`,
    [planId, MPESA_IN_FLIGHT_MS / 1000]
  )
  if (inFlight.rows.length > 0) {
    throw new InstallmentError('An M-Pesa payment for this plan is already in progress. Please wait a moment.', 409)
  }
}

export type PayPlanResult =
  | { source: 'wallet'; plan: PaymentPlan; balance: number; amount: number; completed: boolean; reference: string | null }
  | { source: 'mpesa'; checkoutRequestId: string; customerMessage?: string; amount: number }

export async function payPlanInstallments(
  planId: string,
  userId: string,
  opts: { mode: 'next' | 'all'; source: 'wallet' | 'mpesa'; phone?: string | null }
): Promise<PayPlanResult> {
  if (opts.source === 'wallet') {
    const outcome = await withWallet(userId, async (client) => {
      const plan = await lockActivePlan(client, planId, userId)
      await assertNoPaymentInFlight(client, planId)
      const unpaid = await unpaidInstallments(client, planId)
      const toPay = opts.mode === 'all' ? unpaid : unpaid.slice(0, 1)
      if (toPay.length === 0) throw new InstallmentError('This plan is already fully paid', 409)

      let balance = 0
      let paid = 0
      for (const inst of toPay) {
        const tx = await applyEntry(client, userId, {
          type: 'installment',
          amount: -inst.amount,
          referenceType: 'payment_plan',
          referenceId: planId,
          note: `Installment ${inst.seq} for ${plan.event_title}`,
        })
        balance = Number(tx.balance_after)
        paid += inst.amount
        await client.query(
          `UPDATE ticket_plan_installments SET paid_at = NOW(), wallet_transaction_id = $2 WHERE id = $1`,
          [inst.id, tx.id]
        )
      }
      await client.query(`UPDATE ticket_payment_plans SET amount_paid = amount_paid + $2 WHERE id = $1`, [
        planId,
        roundKes(paid),
      ])
      const reference = await completePlanIfPaid(client, planId)
      return { balance, amount: roundKes(paid), reference }
    })
    if (outcome.reference) await afterPlanCompleted(outcome.reference)
    return {
      source: 'wallet',
      plan: (await getPlan(planId))!,
      balance: outcome.balance,
      amount: outcome.amount,
      completed: Boolean(outcome.reference),
      reference: outcome.reference,
    }
  }

  if (!opts.phone) throw new InstallmentError('Enter a valid M-Pesa number')
  const prepared = await withWallet(userId, async (client) => {
    const plan = await lockActivePlan(client, planId, userId)
    await assertNoPaymentInFlight(client, planId)
    const unpaid = await unpaidInstallments(client, planId)
    const toPay = opts.mode === 'all' ? unpaid : unpaid.slice(0, 1)
    if (toPay.length === 0) throw new InstallmentError('This plan is already fully paid', 409)
    return { plan, toPay, amount: roundKes(toPay.reduce((sum, i) => sum + i.amount, 0)) }
  })

  const seqs = prepared.toPay.map((i) => i.seq).join(', ')
  const txId = await createPendingMpesaTx(userId, {
    type: 'installment',
    walletAmount: 0,
    mpesaAmount: prepared.amount,
    phone: opts.phone,
    referenceType: 'payment_plan',
    referenceId: planId,
    note: `Installment ${seqs} for ${prepared.plan.event_title}`,
  })
  const stk = await startMpesaForTx(txId, opts.phone, prepared.amount, `PLAN-${planId}`)
  await query(`UPDATE ticket_plan_installments SET checkout_request_id = $1 WHERE id = ANY($2::uuid[])`, [
    stk.checkoutRequestId,
    prepared.toPay.map((i) => i.id),
  ])
  return { source: 'mpesa', ...stk, amount: prepared.amount }
}

/**
 * Settles installments paid by M-Pesa. The ledger row has amount 0 (the money never sat in the wallet)
 * and `mpesa_amount` set, so it shows in history without changing the balance.
 * If the plan was cancelled/expired or the installments were already paid in the meantime,
 * the M-Pesa amount is credited to the wallet instead so nothing is lost.
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
    const outcome = await withWallet(row.user_id, async (client, wallet) => {
      const tx = await client.query(
        `SELECT mpesa_amount::float AS mpesa_amount FROM wallet_transactions
         WHERE id = $1 AND status = 'pending' FOR UPDATE`,
        [row.id]
      )
      if (tx.rows.length === 0) return null as { reference: string | null } | null
      const mpesaAmount = Number(tx.rows[0].mpesa_amount ?? 0)

      const plan = await client.query(
        `SELECT status FROM ticket_payment_plans WHERE id = $1 FOR UPDATE`,
        [row.reference_id]
      )
      const installments = await client.query(
        `SELECT id, amount::float AS amount FROM ticket_plan_installments
         WHERE plan_id = $1 AND checkout_request_id = $2 AND paid_at IS NULL`,
        [row.reference_id, checkoutRequestId]
      )

      let applied = 0
      if (plan.rows[0]?.status === 'active' && installments.rows.length > 0) {
        await client.query(
          `UPDATE ticket_plan_installments SET paid_at = NOW(), wallet_transaction_id = $2
           WHERE id = ANY($1::uuid[])`,
          [installments.rows.map((i: { id: string }) => i.id), row.id]
        )
        applied = roundKes(installments.rows.reduce((sum: number, i: { amount: number }) => sum + i.amount, 0))
        await client.query(`UPDATE ticket_payment_plans SET amount_paid = amount_paid + $2 WHERE id = $1`, [
          row.reference_id,
          applied,
        ])
      }

      await client.query(
        `UPDATE wallet_transactions
         SET status = 'completed', balance_after = $2, mpesa_receipt = COALESCE($3, mpesa_receipt)
         WHERE id = $1`,
        [row.id, wallet.balance, mpesaReceipt]
      )

      const leftover = roundKes(mpesaAmount - applied)
      if (leftover > 0) {
        await applyEntry(client, row.user_id, {
          type: 'topup',
          amount: leftover,
          referenceType: 'payment_plan',
          referenceId: row.reference_id,
          note: 'Installment payment received after the plan closed, kept in your wallet',
          mpesaReceipt,
        })
      }

      return { reference: applied > 0 ? await completePlanIfPaid(client, row.reference_id) : null }
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
  credited: number
  balance: number
}

/**
 * Releases an unfinished plan's reserved tickets and credits what was paid to the wallet.
 * Not a member cancellation, so it doesn't count toward the monthly cancellation limit.
 */
export async function expirePlan(planId: string): Promise<ClosedPlan | null> {
  const owner = await query('SELECT user_id FROM ticket_payment_plans WHERE id = $1', [planId])
  const userId: string | undefined = owner.rows[0]?.user_id
  if (!userId) return null

  return withWallet(userId, async (client, wallet) => {
    const plan = await client.query(
      `SELECT p.purchase_batch_id, p.status, p.amount_paid::float AS amount_paid, e.title AS event_title
       FROM ticket_payment_plans p JOIN events e ON e.id = p.event_id
       WHERE p.id = $1 FOR UPDATE OF p`,
      [planId]
    )
    const row = plan.rows[0]
    if (!row || row.status !== 'active') return null

    await client.query(`UPDATE ticket_payment_plans SET status = 'expired' WHERE id = $1`, [planId])
    await client.query(
      `UPDATE tickets SET payment_status = 'cancelled', cancelled_at = NOW()
       WHERE purchase_batch_id = $1 AND payment_status = 'reserved'`,
      [row.purchase_batch_id]
    )

    let balance = wallet.balance
    const credited = roundKes(Number(row.amount_paid ?? 0))
    if (credited > 0) {
      const tx = await applyEntry(client, userId, {
        type: 'plan_expiry_credit',
        amount: credited,
        referenceType: 'payment_plan',
        referenceId: planId,
        note: `Unfinished installment plan: ${row.event_title}`,
      })
      balance = Number(tx.balance_after)
    }
    return { planId, userId, eventTitle: row.event_title, credited, balance }
  })
}
