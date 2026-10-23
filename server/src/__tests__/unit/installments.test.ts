import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))
vi.mock('../../utils/ticketEmail.js', () => ({
  sendTicketBatchEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../utils/captainCommissions.js', () => ({
  recordCaptainCommissionsForCheckout: vi.fn().mockResolvedValue(0),
}))
vi.mock('../../utils/walletMpesa.js', () => ({
  startMpesaForTx: vi.fn(),
}))

import { getClient, query } from '../../config/db.js'
import { sendTicketBatchEmail } from '../../utils/ticketEmail.js'
import { recordCaptainCommissionsForCheckout } from '../../utils/captainCommissions.js'
import {
  InstallmentError,
  buildSchedule,
  expirePlan,
  payPlanInstallments,
  startOfNairobiDay,
} from '../../utils/installments.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const NOW = new Date('2026-10-22T10:00:00Z')
const DAY = 24 * 60 * 60 * 1000

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildSchedule', () => {
  it('splits into whole shillings with the remainder on the last payment', () => {
    const schedule = buildSchedule(1000, 3, new Date(NOW.getTime() + 30 * DAY), NOW)
    expect(schedule.map((s) => s.amount)).toEqual([333, 333, 334])
    expect(schedule.reduce((sum, s) => sum + s.amount, 0)).toBe(1000)
  })

  it('makes the first payment due now and the last at the start of event day (Nairobi)', () => {
    const event = new Date('2026-11-21T06:00:00Z')
    const schedule = buildSchedule(3000, 3, event, NOW)
    const lastDue = startOfNairobiDay(event)
    expect(lastDue.toISOString()).toBe('2026-11-20T21:00:00.000Z')
    expect(schedule[0].due_at.getTime()).toBe(NOW.getTime())
    expect(schedule[2].due_at.getTime()).toBe(lastDue.getTime())
    const midpoint = NOW.getTime() + (lastDue.getTime() - NOW.getTime()) / 2
    expect(Math.abs(schedule[1].due_at.getTime() - midpoint)).toBeLessThanOrEqual(1)
  })

  it('rejects a schedule with fewer than 7 days per installment', () => {
    expect(() => buildSchedule(2000, 2, new Date(NOW.getTime() + 10 * DAY), NOW)).toThrow(InstallmentError)
    expect(() => buildSchedule(3000, 3, new Date(NOW.getTime() + 20 * DAY), NOW)).toThrow(/21 days/)
    expect(() => buildSchedule(2000, 2, new Date(NOW.getTime() + 16 * DAY), NOW)).not.toThrow()
  })

  it('only allows 2 or 3 installments of a paid booking', () => {
    const event = new Date(NOW.getTime() + 60 * DAY)
    expect(() => buildSchedule(1000, 4, event, NOW)).toThrow(/2 or 3/)
    expect(() => buildSchedule(0, 2, event, NOW)).toThrow(InstallmentError)
  })
})

type Plan = { status: string; amount_paid: number; total_amount: number; purchase_batch_id: string }

function setup(opts: { balance: number; plan: Plan; unpaid: { id: string; seq: number; amount: number }[] }) {
  const state = {
    balance: opts.balance,
    plan: { ...opts.plan },
    statements: [] as { sql: string; params: any[] }[],
  }
  const run = (async (sql: string, params: any[] = []) => {
    state.statements.push({ sql, params })
    if (sql.includes('SELECT balance::float AS balance FROM wallets')) return { rows: [{ balance: state.balance }] }
    if (sql.includes('UPDATE wallets SET balance = balance + $2')) {
      state.balance += Number(params[1])
      return { rows: [{ balance: state.balance }] }
    }
    if (sql.includes('SELECT user_id FROM ticket_payment_plans')) return { rows: [{ user_id: USER_ID }] }
    if (sql.includes('SELECT p.id, p.user_id, p.status')) {
      return { rows: [{ id: 'plan-1', user_id: USER_ID, status: state.plan.status, event_title: 'Night Ride' }] }
    }
    if (sql.includes('SELECT p.purchase_batch_id, p.status')) {
      return { rows: [{ ...state.plan, event_title: 'Night Ride' }] }
    }
    if (sql.includes('JOIN wallet_transactions w ON w.checkout_request_id')) return { rows: [] }
    if (sql.includes('WHERE plan_id = $1 AND paid_at IS NULL')) return { rows: opts.unpaid }
    if (sql.includes('INSERT INTO wallet_transactions')) {
      return { rows: [{ id: `tx-${state.statements.length}`, type: params[1], amount: params[2], balance_after: params[3] }] }
    }
    if (sql.includes('SET amount_paid = amount_paid + $2')) {
      state.plan.amount_paid += Number(params[1])
      return { rows: [] }
    }
    if (sql.includes('SELECT purchase_batch_id, status')) return { rows: [state.plan] }
    if (sql.includes("SET status = 'completed', completed_at")) {
      state.plan.status = 'completed'
      return { rows: [] }
    }
    if (sql.includes("SET status = 'expired'")) {
      state.plan.status = 'expired'
      return { rows: [] }
    }
    if (sql.includes('json_agg')) return { rows: [{ id: 'plan-1', ...state.plan, installments: [] }] }
    return { rows: [] }
  }) as any
  vi.mocked(query).mockImplementation(run)
  vi.mocked(getClient).mockImplementation((async () => ({ query: vi.fn(run), release: vi.fn() })) as any)
  return state
}

describe('payPlanInstallments (wallet)', () => {
  it('paying the last installment completes the plan and issues the tickets', async () => {
    const state = setup({
      balance: 1000,
      plan: { status: 'active', amount_paid: 666, total_amount: 1000, purchase_batch_id: 'batch-1' },
      unpaid: [{ id: 'inst-3', seq: 3, amount: 334 }],
    })

    const result = await payPlanInstallments('plan-1', USER_ID, { mode: 'next', source: 'wallet' })

    expect(result).toMatchObject({ source: 'wallet', amount: 334, completed: true, reference: 'PLAN-plan-1', balance: 666 })
    expect(state.plan).toMatchObject({ status: 'completed', amount_paid: 1000 })
    const issue = state.statements.find((s) => s.sql.includes("SET payment_status = 'paid'"))
    expect(issue?.params).toEqual(['batch-1', 'PLAN-plan-1'])
    expect(recordCaptainCommissionsForCheckout).toHaveBeenCalledWith('PLAN-plan-1')
    expect(sendTicketBatchEmail).toHaveBeenCalledWith('PLAN-plan-1')
  })

  it('a middle installment keeps the plan active and the tickets reserved', async () => {
    const state = setup({
      balance: 1000,
      plan: { status: 'active', amount_paid: 333, total_amount: 1000, purchase_batch_id: 'batch-1' },
      unpaid: [
        { id: 'inst-2', seq: 2, amount: 333 },
        { id: 'inst-3', seq: 3, amount: 334 },
      ],
    })

    const result = await payPlanInstallments('plan-1', USER_ID, { mode: 'next', source: 'wallet' })

    expect(result).toMatchObject({ completed: false, amount: 333 })
    expect(state.plan.status).toBe('active')
    expect(state.statements.some((s) => s.sql.includes("SET payment_status = 'paid'"))).toBe(false)
    expect(sendTicketBatchEmail).not.toHaveBeenCalled()
  })

  it('refuses to pay a plan that is no longer active', async () => {
    setup({
      balance: 1000,
      plan: { status: 'expired', amount_paid: 333, total_amount: 1000, purchase_batch_id: 'batch-1' },
      unpaid: [{ id: 'inst-2', seq: 2, amount: 333 }],
    })
    await expect(payPlanInstallments('plan-1', USER_ID, { mode: 'all', source: 'wallet' })).rejects.toMatchObject({
      status: 409,
    })
  })
})

describe('expirePlan', () => {
  it('releases the tickets and credits what was paid, without counting as a cancellation', async () => {
    const state = setup({
      balance: 50,
      plan: { status: 'active', amount_paid: 666, total_amount: 1000, purchase_batch_id: 'batch-1' },
      unpaid: [],
    })

    const closed = await expirePlan('plan-1')

    expect(closed).toMatchObject({ credited: 666, balance: 716, eventTitle: 'Night Ride' })
    expect(state.plan.status).toBe('expired')
    const credit = state.statements.find((s) => s.sql.includes('INSERT INTO wallet_transactions'))
    expect(credit?.params[1]).toBe('plan_expiry_credit')
    expect(state.statements.some((s) => s.sql.includes('ticket_cancellations'))).toBe(false)
    expect(
      state.statements.some((s) => s.sql.includes("SET payment_status = 'cancelled'") && s.params[0] === 'batch-1')
    ).toBe(true)
  })

  it('does nothing for a plan that already finished', async () => {
    setup({
      balance: 0,
      plan: { status: 'completed', amount_paid: 1000, total_amount: 1000, purchase_batch_id: 'batch-1' },
      unpaid: [],
    })
    expect(await expirePlan('plan-1')).toBeNull()
  })
})
