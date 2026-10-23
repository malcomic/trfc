import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))
vi.mock('../../utils/captainCommissions.js', () => ({
  reverseCaptainCommission: vi.fn().mockResolvedValue(true),
}))
vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

import { getClient, query } from '../../config/db.js'
import { reverseCaptainCommission } from '../../utils/captainCommissions.js'
import {
  CancellationError,
  cancelTicket,
  evaluateCancellation,
  startOfNextNairobiMonth,
  type CancellableTicket,
} from '../../utils/ticketCancellation.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_ID = '44444444-4444-4444-8444-444444444444'
const NOW = new Date('2026-10-22T10:00:00Z')
const DAY = 24 * 60 * 60 * 1000

const paidTicket = (overrides: Partial<CancellableTicket> = {}): CancellableTicket => ({
  id: 'ticket-1',
  user_id: USER_ID,
  purchase_batch_id: 'batch-1',
  payment_status: 'paid',
  checked_in_at: null,
  price: 1500,
  event_title: 'Thika Road 10K',
  event_date: new Date(NOW.getTime() + 20 * DAY),
  plan_id: null,
  plan_status: null,
  plan_amount_paid: null,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('evaluateCancellation', () => {
  it('allows a paid ticket well before the event and credits its price', () => {
    expect(evaluateCancellation(paidTicket(), USER_ID, 0, NOW)).toEqual({
      allowed: true,
      creditAmount: 1500,
      cancelsPlan: false,
    })
  })

  it('rejects cancelling within 7 days of the event', () => {
    const result = evaluateCancellation(
      paidTicket({ event_date: new Date(NOW.getTime() + 6 * DAY) }),
      USER_ID,
      0,
      NOW
    )
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/7 days/)
  })

  it('allows exactly 7 days before the event', () => {
    const result = evaluateCancellation(paidTicket({ event_date: new Date(NOW.getTime() + 7 * DAY) }), USER_ID, 0, NOW)
    expect(result.allowed).toBe(true)
  })

  it('rejects a second cancellation in the same calendar month and says when the next is allowed', () => {
    const result = evaluateCancellation(paidTicket(), USER_ID, 1, NOW)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/one ticket per month/)
    // 1 Nov 00:00 in Nairobi (UTC+3)
    expect(result.nextAllowedAt?.toISOString()).toBe('2026-10-31T21:00:00.000Z')
  })

  it('rejects checked-in tickets', () => {
    const result = evaluateCancellation(paidTicket({ checked_in_at: new Date() }), USER_ID, 0, NOW)
    expect(result).toMatchObject({ allowed: false, reason: expect.stringMatching(/used/) })
  })

  it("rejects someone else's ticket", () => {
    expect(evaluateCancellation(paidTicket({ user_id: OTHER_ID }), USER_ID, 0, NOW)).toMatchObject({
      allowed: false,
      reason: 'Ticket not found',
    })
  })

  it('rejects pending and already-cancelled tickets', () => {
    expect(evaluateCancellation(paidTicket({ payment_status: 'pending' }), USER_ID, 0, NOW).allowed).toBe(false)
    expect(evaluateCancellation(paidTicket({ payment_status: 'cancelled' }), USER_ID, 0, NOW).allowed).toBe(false)
  })

  it('cancels the whole plan for a reserved ticket and credits what was paid on it', () => {
    const result = evaluateCancellation(
      paidTicket({ payment_status: 'reserved', plan_id: 'plan-1', plan_status: 'active', plan_amount_paid: 1000 }),
      USER_ID,
      0,
      NOW
    )
    expect(result).toEqual({ allowed: true, creditAmount: 1000, cancelsPlan: true })
  })
})

describe('startOfNextNairobiMonth', () => {
  it('uses the Nairobi calendar month, not UTC', () => {
    // 31 Oct 22:00 UTC is already 1 Nov 01:00 in Nairobi.
    expect(startOfNextNairobiMonth(new Date('2026-10-31T22:00:00Z')).toISOString()).toBe('2026-11-30T21:00:00.000Z')
    expect(startOfNextNairobiMonth(new Date('2026-12-15T12:00:00Z')).toISOString()).toBe('2026-12-31T21:00:00.000Z')
  })
})

describe('cancelTicket', () => {
  function setup(ticket: CancellableTicket, cancellationsThisMonth = 0) {
    const state = { balance: 200, statements: [] as { sql: string; params: any[] }[] }
    const run = (async (sql: string, params: any[] = []) => {
      state.statements.push({ sql, params })
      if (sql.includes('SELECT balance::float AS balance FROM wallets')) return { rows: [{ balance: state.balance }] }
      if (sql.includes('UPDATE wallets SET balance = balance + $2')) {
        state.balance += Number(params[1])
        return { rows: [{ balance: state.balance }] }
      }
      if (sql.includes('WHERE t.id = $1 FOR UPDATE OF t')) return { rows: [ticket] }
      if (sql.includes('FROM ticket_cancellations')) return { rows: [{ count: cancellationsThisMonth }] }
      if (sql.includes('INSERT INTO wallet_transactions')) {
        return { rows: [{ id: 'credit-tx', type: params[1], amount: params[2], balance_after: params[3] }] }
      }
      if (sql.includes('FROM users')) return { rows: [{ email: 'jane@example.com', name: 'Jane' }] }
      return { rows: [] }
    }) as any
    vi.mocked(query).mockImplementation(run)
    vi.mocked(getClient).mockImplementation((async () => ({ query: vi.fn(run), release: vi.fn() })) as any)
    return state
  }

  it('credits the unit price to the wallet, records the cancellation and reverses commission', async () => {
    const ticket = paidTicket({ event_date: new Date(Date.now() + 30 * DAY) })
    const state = setup(ticket)

    const result = await cancelTicket('ticket-1', USER_ID)

    expect(result).toMatchObject({ credited: 1500, balance: 1700, cancelledTicketIds: ['ticket-1'] })
    const credit = state.statements.find((s) => s.sql.includes('INSERT INTO wallet_transactions'))
    expect(credit?.params[1]).toBe('cancellation_credit')
    expect(state.statements.some((s) => s.sql.includes('INSERT INTO ticket_cancellations'))).toBe(true)
    expect(
      state.statements.some((s) => s.sql.includes("SET payment_status = 'cancelled'") && s.params[0] === 'ticket-1')
    ).toBe(true)
    expect(reverseCaptainCommission).toHaveBeenCalledWith('ticket', 'ticket-1')
  })

  it('refuses when the monthly limit has been used and changes nothing', async () => {
    const state = setup(paidTicket({ event_date: new Date(Date.now() + 30 * DAY) }), 1)

    await expect(cancelTicket('ticket-1', USER_ID)).rejects.toBeInstanceOf(CancellationError)
    expect(state.balance).toBe(200)
    expect(state.statements.some((s) => s.sql.includes('INSERT INTO ticket_cancellations'))).toBe(false)
    expect(reverseCaptainCommission).not.toHaveBeenCalled()
  })

  it("returns 404 for someone else's ticket", async () => {
    setup(paidTicket({ user_id: OTHER_ID, event_date: new Date(Date.now() + 30 * DAY) }))
    await expect(cancelTicket('ticket-1', USER_ID)).rejects.toMatchObject({ status: 404 })
  })
})
