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
vi.mock('../../utils/metaConversions.js', () => ({
  reportMetaPurchase: vi.fn(),
  saveMetaContext: vi.fn(),
}))
vi.mock('../../utils/walletMpesa.js', () => ({
  startMpesaForTx: vi.fn(),
}))

import { getClient, query } from '../../config/db.js'
import { sendTicketBatchEmail } from '../../utils/ticketEmail.js'
import { InstallmentError, buildSchedule, expirePlan, payPlanInstallments } from '../../utils/installments.js'
import { clearTicketRulesCache } from '../../utils/ticketRules.js'
import { createFakeCreditDb } from './helpers/fakeCreditDb.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const PLAN_ID = '33333333-3333-4333-8333-333333333333'

const terms = { eventDay: '2026-12-12', deadlineDays: 3, depositPct: 30, roundTo: 10 }
const NOW = new Date('2026-11-01T09:00:00Z')

beforeEach(() => {
  vi.clearAllMocks()
  clearTicketRulesCache()
})

describe('buildSchedule', () => {
  it('takes 30% first, rounded up to the next KSh 10 (1,497 -> 450), with the rest due by the deadline', () => {
    const plan = buildSchedule(1497, { ...terms, now: NOW })
    expect(plan.deposit).toBe(450)
    // Deadline: end of 9 Dec (3 days before the 12 Dec event), 11:59:59 pm Nairobi.
    expect(plan.deadline.toISOString()).toBe('2026-12-09T20:59:59.000Z')
    expect(plan.schedule.map((s) => s.amount)).toEqual([450, 1047])
    expect(plan.schedule[0].due_at).toEqual(NOW)
    expect(plan.schedule[1].due_at).toEqual(plan.deadline)
  })

  it('splits the rest across the dates the member picks, in date order', () => {
    const plan = buildSchedule(1497, {
      ...terms,
      now: NOW,
      dates: [new Date('2026-12-01T09:00:00Z'), new Date('2026-11-15T09:00:00Z')],
    })
    expect(plan.schedule.map((s) => [s.amount, s.due_at.toISOString().slice(0, 10)])).toEqual([
      [450, '2026-11-01'],
      [523, '2026-11-15'],
      [524, '2026-12-01'],
    ])
  })

  it('rejects dates after the deadline, past dates and too many dates', () => {
    expect(() => buildSchedule(1497, { ...terms, now: NOW, dates: [new Date('2026-12-10T09:00:00Z')] })).toThrow(
      InstallmentError
    )
    expect(() => buildSchedule(1497, { ...terms, now: NOW, dates: [new Date('2026-10-01T09:00:00Z')] })).toThrow(
      'Payment dates must be in the future'
    )
    const many = [2, 3, 4, 5, 6].map((d) => new Date(`2026-11-0${d}T09:00:00Z`))
    expect(() => buildSchedule(1497, { ...terms, now: NOW, dates: many })).toThrow('at most 4')
  })

  it('closes paying in parts once the deadline has passed, and needs a paid ticket', () => {
    expect(() => buildSchedule(1497, { ...terms, now: new Date('2026-12-10T08:00:00Z') })).toThrow('closed on')
    expect(() => buildSchedule(0, { ...terms, now: NOW })).toThrow('paid tickets')
  })
})

function planDb(plan: { amount_paid: number; total_amount: number; status?: string; deadline_at?: string }) {
  const db = createFakeCreditDb([{ id: 'c1', user_id: USER_ID, remaining: 5000 }])
  const state = { ...plan, status: plan.status ?? 'active', completed: false, paidRef: null as string | null }
  const run = async (sql: string, params: any[] = []) => {
    if (sql.includes('FROM ticket_payment_plans p JOIN events e') && sql.includes('p.deadline_at')) {
      return {
        rows: [
          {
            id: PLAN_ID,
            user_id: USER_ID,
            status: state.status,
            deadline_at: state.deadline_at ?? '2026-12-09T20:59:59Z',
            total_amount: state.total_amount,
            amount_paid: state.amount_paid,
            event_title: 'Ngong Hills Hike',
          },
        ],
      }
    }
    if (sql.includes('SELECT 1 FROM wallet_transactions')) return { rows: [] }
    if (sql.includes('SUM(amount) OVER (ORDER BY seq)') && sql.includes('running::float')) {
      return { rows: [{ running: 450 + 524 }] }
    }
    if (sql.includes('UPDATE ticket_payment_plans SET amount_paid')) {
      state.amount_paid += Number(params[1])
      return { rows: [] }
    }
    if (sql.includes('FROM ticket_payment_plans WHERE id = $1') && sql.includes('purchase_batch_id, status')) {
      return { rows: [{ purchase_batch_id: 'batch-1', ...state }] }
    }
    if (sql.includes("SET status = 'completed', completed_at")) {
      state.completed = true
      return { rows: [] }
    }
    if (sql.includes("UPDATE tickets SET payment_status = 'paid', checkout_request_id = $2")) {
      state.paidRef = params[1]
      return { rows: [] }
    }
    if (sql.includes('WHERE p.id = $1') && sql.includes('json_agg')) return { rows: [{ id: PLAN_ID, ...state }] }
    return db.run(sql, params)
  }
  vi.mocked(query).mockImplementation(run as any)
  vi.mocked(getClient).mockImplementation((async () => ({ query: vi.fn(run), release: vi.fn() })) as any)
  return { state, db }
}

describe('payPlanInstallments with ticket value', () => {
  it('paying everything left completes the plan and issues the tickets', async () => {
    const { state, db } = planDb({ amount_paid: 450, total_amount: 1497 })

    const result = await payPlanInstallments(PLAN_ID, USER_ID, { mode: 'all', source: 'credit' })

    expect(result).toMatchObject({ source: 'credit', amount: 1047, completed: true, reference: `PLAN-${PLAN_ID}` })
    expect(state.amount_paid).toBe(1497)
    expect(state.paidRef).toBe(`PLAN-${PLAN_ID}`)
    expect(db.state.credits[0].remaining).toBe(5000 - 1047)
    expect(sendTicketBatchEmail).toHaveBeenCalledWith(`PLAN-${PLAN_ID}`)
  })

  it('paying the next part keeps the plan open and the tickets reserved', async () => {
    const { state } = planDb({ amount_paid: 450, total_amount: 1497 })

    const result = await payPlanInstallments(PLAN_ID, USER_ID, { mode: 'next', source: 'credit' })

    expect(result).toMatchObject({ amount: 524, completed: false })
    expect(state.completed).toBe(false)
    expect(state.paidRef).toBeNull()
  })

  it('refuses a closed plan and a plan past its deadline', async () => {
    planDb({ amount_paid: 450, total_amount: 1497, status: 'expired' })
    await expect(payPlanInstallments(PLAN_ID, USER_ID, { mode: 'all', source: 'credit' })).rejects.toMatchObject({
      status: 409,
    })
    planDb({ amount_paid: 450, total_amount: 1497, deadline_at: '2020-01-01T00:00:00Z' })
    await expect(payPlanInstallments(PLAN_ID, USER_ID, { mode: 'all', source: 'credit' })).rejects.toThrow(
      'deadline'
    )
  })
})

describe('expirePlan', () => {
  it('releases the seat and turns what was paid into ticket value, usable straight away', async () => {
    const calls: [string, any[]][] = []
    const run = async (sql: string, params: any[] = []) => {
      calls.push([sql, params])
      if (sql.includes('SELECT user_id FROM ticket_payment_plans')) return { rows: [{ user_id: USER_ID }] }
      if (sql.includes('FOR UPDATE OF p')) {
        return {
          rows: [
            {
              user_id: USER_ID,
              event_id: 'ev-1',
              purchase_batch_id: 'batch-1',
              status: 'active',
              amount_paid: 450,
              event_title: 'Ngong Hills Hike',
              event_day: '2026-12-12',
            },
          ],
        }
      }
      if (sql.includes("UPDATE tickets SET payment_status = 'cancelled'")) return { rows: [{ referral_region_id: 'zone-1' }] }
      if (sql.includes('INSERT INTO ticket_credits')) return { rows: [{ id: 'credit-1' }] }
      if (sql.includes('UPDATE wallets SET balance')) return { rows: [{ balance: 450 }] }
      if (sql.includes('INSERT INTO wallet_transactions')) return { rows: [{ id: 'tx-1' }] }
      return { rows: [] }
    }
    vi.mocked(query).mockImplementation(run as any)
    vi.mocked(getClient).mockImplementation((async () => ({ query: vi.fn(run), release: vi.fn() })) as any)

    const before = Date.now()
    const closed = await expirePlan(PLAN_ID)

    expect(closed).toMatchObject({ planId: PLAN_ID, credited: 450, eventTitle: 'Ngong Hills Hike' })
    // 60 days after the 12 Dec event: 10 Feb 2027, 11:59:59 pm Nairobi.
    expect(closed?.expiresAt?.toISOString()).toBe('2027-02-10T20:59:59.000Z')
    const status = calls.find(([sql]) => sql.includes('UPDATE ticket_payment_plans SET status = $2'))
    expect(status?.[1]).toEqual([PLAN_ID, 'expired'])
    const credit = calls.find(([sql]) => sql.includes('INSERT INTO ticket_credits'))!
    expect(credit[1][4]).toBe('missed_deadline')
    expect(credit[1][5]).toBe('zone-1')
    expect(new Date(credit[1][7]).getTime()).toBeGreaterThanOrEqual(before)
  })
})
