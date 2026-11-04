import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))
vi.mock('../../utils/captainCommissions.js', () => ({
  reverseCaptainCommission: vi.fn().mockResolvedValue(true),
  recordCaptainCommissionsForCheckout: vi.fn().mockResolvedValue(0),
}))
vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('../../utils/waitlist.js', () => ({
  notifyWaitlist: vi.fn().mockResolvedValue(0),
}))

import { getClient, query } from '../../config/db.js'
import { reverseCaptainCommission } from '../../utils/captainCommissions.js'
import { notifyWaitlist } from '../../utils/waitlist.js'
import { CancellationError, cancelTicket, evaluateCancellation, type CancellableTicket } from '../../utils/ticketCancellation.js'
import { clearTicketRulesCache } from '../../utils/ticketRules.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const TICKET_ID = '11111111-1111-4111-8111-111111111111'
const rules = { cancelDeadlineDays: 3 }

// Hike on Sat 12 Dec 2026, 6:00 am Nairobi; it can be given up until Wed 9 Dec, 11:59:59 pm Nairobi.
const STARTS_AT = '2026-12-12T03:00:00.000Z'
const DEADLINE = '2026-12-09T20:59:59.000Z'

const ticket = (overrides: Partial<CancellableTicket> = {}): CancellableTicket => ({
  id: TICKET_ID,
  user_id: USER_ID,
  event_id: 'ev-1',
  purchase_batch_id: 'batch-1',
  payment_status: 'paid',
  checked_in_at: null,
  price: 1497,
  event_title: 'Ngong Hills Hike',
  event_starts_at: STARTS_AT,
  event_day: '2026-12-12',
  event_cancelled_at: null,
  referral_region_id: 'zone-1',
  plan_id: null,
  plan_status: null,
  plan_amount_paid: null,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  clearTicketRulesCache()
})

describe('evaluateCancellation', () => {
  it('is allowed until 11:59 pm Nairobi on the Wednesday, 3 days before a Saturday event', () => {
    const result = evaluateCancellation(ticket(), USER_ID, rules, new Date('2026-12-09T20:59:00.000Z'))
    expect(result).toEqual({
      allowed: true,
      creditAmount: 1497,
      cancelsPlan: false,
      noticeStatus: 'cancelled_early',
      deadline: new Date(DEADLINE),
    })
    expect(evaluateCancellation(ticket(), USER_ID, rules, new Date(DEADLINE))).toMatchObject({ allowed: true })
  })

  it('is blocked after the deadline, and says when the deadline was', () => {
    const result = evaluateCancellation(ticket(), USER_ID, rules, new Date('2026-12-09T21:00:00.000Z'))
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/^You could give up this ticket until .*9 Dec.*, 11:59 pm$/)
    expect(evaluateCancellation(ticket(), USER_ID, rules, new Date('2026-12-11T20:00:00Z'))).toMatchObject({
      allowed: false,
    })
  })

  it('uses the configured number of days', () => {
    const now = new Date('2026-12-10T12:00:00Z')
    expect(evaluateCancellation(ticket(), USER_ID, rules, now).allowed).toBe(false)
    expect(evaluateCancellation(ticket(), USER_ID, { cancelDeadlineDays: 1 }, now)).toMatchObject({
      allowed: true,
      deadline: new Date('2026-12-11T20:59:59.000Z'),
    })
  })

  it('cannot be done once the event starts, after check-in, or for an event TRFC cancelled', () => {
    const start = new Date(STARTS_AT)
    expect(evaluateCancellation(ticket(), USER_ID, rules, start)).toMatchObject({ allowed: false })
    expect(
      evaluateCancellation(ticket({ checked_in_at: '2026-12-12T03:10:00Z' }), USER_ID, rules, new Date('2026-12-01'))
    ).toMatchObject({ allowed: false, reason: 'This ticket has already been used' })
    expect(
      evaluateCancellation(ticket({ event_cancelled_at: '2026-12-01' }), USER_ID, rules, new Date('2026-12-02'))
    ).toMatchObject({ allowed: false, reason: 'This event was cancelled by TRFC' })
  })

  it('cancels the whole plan for a reserved ticket, credits what was paid, and follows the same deadline', () => {
    const reserved = ticket({ payment_status: 'reserved', plan_id: 'plan-1', plan_status: 'active', plan_amount_paid: 450 })
    const result = evaluateCancellation(reserved, USER_ID, rules, new Date('2026-12-08T00:00:00Z'))
    expect(result).toEqual({
      allowed: true,
      creditAmount: 450,
      cancelsPlan: true,
      noticeStatus: 'cancelled_early',
      deadline: new Date(DEADLINE),
    })
    expect(evaluateCancellation(reserved, USER_ID, rules, new Date('2026-12-09T21:00:00Z')).allowed).toBe(false)
  })

  it("refuses someone else's ticket", () => {
    expect(evaluateCancellation(ticket(), 'someone-else', rules, new Date('2026-12-01'))).toMatchObject({
      allowed: false,
      reason: 'Ticket not found',
    })
  })
})

function setupDb(row: CancellableTicket) {
  const calls: [string, any[]][] = []
  const run = async (sql: string, params: any[] = []) => {
    calls.push([sql, params])
    if (sql.includes('FOR UPDATE OF t')) return { rows: [row] }
    if (sql.includes('INSERT INTO ticket_credits')) return { rows: [{ id: 'credit-1' }] }
    if (sql.includes('UPDATE wallets SET balance')) return { rows: [{ balance: 1497 }] }
    if (sql.includes('INSERT INTO wallet_transactions')) return { rows: [{ id: 'tx-1' }] }
    return { rows: [] }
  }
  vi.mocked(query).mockImplementation(run as any)
  vi.mocked(getClient).mockImplementation((async () => ({ query: vi.fn(run), release: vi.fn() })) as any)
  return calls
}

describe('cancelTicket', () => {
  it('early notice: credit usable now, valid 60 days after the event; waitlist told, no ticket commission to reverse', async () => {
    vi.useFakeTimers({ now: new Date('2026-12-01T09:00:00Z'), toFake: ['Date'] })
    try {
      const calls = setupDb(ticket())
      const result = await cancelTicket(TICKET_ID, USER_ID)

      expect(result).toMatchObject({ credited: 1497, noticeStatus: 'cancelled_early', cancelledTicketIds: [TICKET_ID] })
      expect(result.availableFrom?.toISOString()).toBe('2026-12-01T09:00:00.000Z')
      expect(result.expiresAt?.toISOString()).toBe('2027-02-10T20:59:59.000Z')
      const update = calls.find(([sql]) => sql.includes("SET payment_status = 'cancelled'"))!
      expect(update[1]).toEqual([TICKET_ID, 'cancelled_early'])
      const credit = calls.find(([sql]) => sql.includes('INSERT INTO ticket_credits'))!
      expect(credit[1][4]).toBe('cancelled_early')
      expect(credit[1][5]).toBe('zone-1')
      expect(reverseCaptainCommission).not.toHaveBeenCalled()
      expect(notifyWaitlist).toHaveBeenCalledWith('ev-1')
    } finally {
      vi.useRealTimers()
    }
  })

  it('after the deadline: refused and no credit is created', async () => {
    vi.useFakeTimers({ now: new Date('2026-12-11T20:00:00Z'), toFake: ['Date'] })
    try {
      const calls = setupDb(ticket())
      await expect(cancelTicket(TICKET_ID, USER_ID)).rejects.toBeInstanceOf(CancellationError)
      expect(calls.some(([sql]) => sql.includes('INSERT INTO ticket_credits'))).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('changes nothing when the ticket cannot be given up', async () => {
    const calls = setupDb(ticket({ payment_status: 'cancelled' }))
    await expect(cancelTicket(TICKET_ID, USER_ID)).rejects.toBeInstanceOf(CancellationError)
    expect(calls.some(([sql]) => sql.includes('INSERT INTO ticket_credits'))).toBe(false)
    expect(calls.some(([sql]) => sql === 'ROLLBACK')).toBe(true)
  })
})
