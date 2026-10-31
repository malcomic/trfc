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
const rules = { earlyNoticeHours: 24 }

// Hike on Sat 12 Dec 2026, 6:00 am Nairobi.
const STARTS_AT = '2026-12-12T03:00:00.000Z'

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
  it('is "cancelled early" with 24 hours or more notice', () => {
    const result = evaluateCancellation(ticket(), USER_ID, rules, new Date('2026-12-11T03:00:00.000Z'))
    expect(result).toEqual({ allowed: true, creditAmount: 1497, cancelsPlan: false, noticeStatus: 'cancelled_early' })
  })

  it('is a no-show with less notice, but still gives the same credit', () => {
    const result = evaluateCancellation(ticket(), USER_ID, rules, new Date('2026-12-11T03:00:01.000Z'))
    expect(result).toMatchObject({ allowed: true, creditAmount: 1497, noticeStatus: 'no_show' })
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

  it("cancels the whole plan for a reserved ticket, credits what was paid, and is always early", () => {
    const result = evaluateCancellation(
      ticket({ payment_status: 'reserved', plan_id: 'plan-1', plan_status: 'active', plan_amount_paid: 450 }),
      USER_ID,
      rules,
      new Date('2026-12-08T00:00:00Z')
    )
    expect(result).toEqual({ allowed: true, creditAmount: 450, cancelsPlan: true, noticeStatus: 'cancelled_early' })
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
  it('early notice: credit usable now, valid 60 days after the event; commission reversed and waitlist told', async () => {
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
      expect(reverseCaptainCommission).toHaveBeenCalledWith('ticket', TICKET_ID)
      expect(notifyWaitlist).toHaveBeenCalledWith('ev-1')
    } finally {
      vi.useRealTimers()
    }
  })

  it('late notice: recorded as a no-show, credit appears the morning after the event', async () => {
    vi.useFakeTimers({ now: new Date('2026-12-11T20:00:00Z'), toFake: ['Date'] })
    try {
      const calls = setupDb(ticket())
      const result = await cancelTicket(TICKET_ID, USER_ID)

      expect(result.noticeStatus).toBe('no_show')
      expect(result.availableFrom?.toISOString()).toBe('2026-12-13T03:00:00.000Z')
      const credit = calls.find(([sql]) => sql.includes('INSERT INTO ticket_credits'))!
      expect(credit[1][4]).toBe('no_show')
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
