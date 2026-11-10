import { describe, it, expect, vi, beforeEach } from 'vitest'

const client = { query: vi.fn(), release: vi.fn() }
vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn(async () => client) }))
vi.mock('../../controllers/paymentsController.js', () => ({
  sendStkPush: vi.fn(),
  stkErrorMessage: vi.fn(() => 'Failed to initiate payment'),
  InvalidMpesaPhoneError: class extends Error {},
}))
vi.mock('../../utils/membershipEmail.js', () => ({ sendMembershipWelcome: vi.fn(async () => true) }))
vi.mock('../../utils/paymentLogger.js', () => ({ logError: vi.fn() }))

import { query } from '../../config/db.js'
import { sendStkPush } from '../../controllers/paymentsController.js'
import { sendMembershipWelcome } from '../../utils/membershipEmail.js'
import {
  failMembershipByCheckoutId,
  settleMembershipByCheckoutId,
  startMembershipCheckout,
} from '../../utils/membership.js'

const USER = '11111111-1111-4111-8111-111111111111'
const MEMBERSHIP = '22222222-2222-4222-8222-222222222222'
const DAY = 24 * 60 * 60 * 1000

const SETTINGS_ROW = {
  standard_price: '2447.00',
  founding_price: '1997.00',
  founding_limit: 100,
  founding_deadline: new Date(Date.now() + 30 * DAY),
  renewal_price: '1997.00',
  renewal_grace_days: 30,
  sales_open_at: new Date(Date.now() - DAY),
  sales_paused: false,
  updated_at: null,
}

interface Scenario {
  pending?: { id: string; checkout_request_id: string | null; amount: string; price_type: string } | null
  history?: { price_type: string; status: string; ends_at: Date }[]
  foundingTaken?: number
  settleRow?: { id: string; user_id: string; price_type: string } | null
  latestPaidEnd?: Date | null
  foundingPaid?: number
}

const sqlCalls = (fn: { mock: { calls: unknown[][] } }, match: string) =>
  fn.mock.calls.filter(([sql]) => String(sql).includes(match))

function setup(s: Scenario) {
  const handler = async (sql: string) => {
    if (sql.includes('FROM membership_settings')) return { rows: [SETTINGS_ROW] }
    if (sql.includes("status = 'pending' AND hold_expires_at > NOW()") && sql.includes('ORDER BY created_at DESC')) {
      return { rows: s.pending ? [s.pending] : [] }
    }
    if (sql.includes('SELECT price_type, status, ends_at FROM memberships')) return { rows: s.history ?? [] }
    if (sql.includes('AS taken')) return { rows: [{ taken: s.foundingTaken ?? 0 }] }
    if (sql.includes('INSERT INTO memberships')) return { rows: [{ id: MEMBERSHIP }] }
    if (sql.startsWith('SELECT 1 FROM memberships')) return { rows: s.settleRow ? [{ '?column?': 1 }] : [] }
    if (sql.includes('SELECT id, user_id, price_type FROM memberships')) return { rows: s.settleRow ? [s.settleRow] : [] }
    if (sql.includes('MAX(ends_at)')) return { rows: [{ ends_at: s.latestPaidEnd ?? null }] }
    if (sql.includes('AS paid FROM memberships')) return { rows: [{ paid: s.foundingPaid ?? 0 }] }
    return { rows: [], rowCount: 1 }
  }
  vi.mocked(query).mockImplementation(handler as any)
  client.query.mockImplementation(handler as any)
}

describe('startMembershipCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sendStkPush).mockResolvedValue({ ResponseCode: '0', CheckoutRequestID: 'ws_CO_1', CustomerMessage: 'ok' } as any)
  })

  it('locks the settings row, holds a founding place for 10 minutes and sends MEMBER-<id>', async () => {
    setup({ foundingTaken: 99 })
    const result = await startMembershipCheckout(USER, '254712345678')
    expect(result).toMatchObject({ membershipId: MEMBERSHIP, checkoutRequestId: 'ws_CO_1', amount: 1997, priceType: 'founding', reused: false })
    expect(sqlCalls(client.query, 'FOR UPDATE')).toHaveLength(1)
    const insert = sqlCalls(client.query, 'INSERT INTO memberships')[0]
    expect(insert[1]).toEqual(expect.arrayContaining([USER, 'founding', 1997, '10']))
    expect(sendStkPush).toHaveBeenCalledWith('254712345678', 1997, `MEMBER-${MEMBERSHIP}`)
    expect(sqlCalls(vi.mocked(query), 'SET checkout_request_id')[0][1]).toEqual([MEMBERSHIP, 'ws_CO_1'])
  })

  it('counts held founding places, so the 101st buyer pays the standard price', async () => {
    setup({ foundingTaken: 100 })
    const result = await startMembershipCheckout(USER, '254712345678')
    expect(result).toMatchObject({ priceType: 'standard', amount: 2447 })
    const taken = sqlCalls(client.query, 'AS taken')[0][0] as string
    expect(taken).toContain("status = 'pending' AND hold_expires_at > NOW()")
  })

  it('reuses a pending payment that is still being held', async () => {
    setup({ pending: { id: MEMBERSHIP, checkout_request_id: 'ws_CO_old', amount: '1997.00', price_type: 'renewal' } })
    const result = await startMembershipCheckout(USER, '254712345678')
    expect(result).toEqual({ reused: true, membershipId: MEMBERSHIP, checkoutRequestId: 'ws_CO_old', amount: 1997, priceType: 'renewal' })
    expect(sendStkPush).not.toHaveBeenCalled()
    expect(sqlCalls(client.query, 'INSERT INTO memberships')).toHaveLength(0)
  })

  it('marks the row failed when the STK push fails', async () => {
    setup({})
    vi.mocked(sendStkPush).mockRejectedValueOnce(new Error('boom'))
    await expect(startMembershipCheckout(USER, '254712345678')).rejects.toThrow('Failed to initiate payment')
    expect(sqlCalls(vi.mocked(query), "SET status = 'failed'")[0][1]).toEqual([MEMBERSHIP])
  })

  it('refuses before sales open', async () => {
    setup({})
    vi.mocked(query).mockImplementation((async (sql: string) =>
      sql.includes('FROM membership_settings') ? { rows: [{ ...SETTINGS_ROW, sales_open_at: new Date(Date.now() + DAY) }] } : { rows: [] }) as any)
    client.query.mockImplementation(vi.mocked(query).getMockImplementation()!)
    await expect(startMembershipCheckout(USER, '254712345678')).rejects.toThrow('not opened')
  })
})

describe('settleMembershipByCheckoutId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing when there is no unsettled membership, so repeats are safe', async () => {
    setup({ settleRow: null })
    expect(await settleMembershipByCheckoutId('ws_CO_1', 'RCPT1')).toBe(0)
    expect(client.query).not.toHaveBeenCalled()
    expect(sendMembershipWelcome).not.toHaveBeenCalled()
  })

  it('recomputes the dates from the latest paid year and extends member_until', async () => {
    const latest = new Date(Date.now() + 20 * DAY)
    setup({ settleRow: { id: MEMBERSHIP, user_id: USER, price_type: 'renewal' }, latestPaidEnd: latest })
    expect(await settleMembershipByCheckoutId('ws_CO_1', 'RCPT1')).toBe(1)
    const update = sqlCalls(client.query, "SET status = 'paid'")[0][1] as unknown[]
    expect(update[0]).toBe(MEMBERSHIP)
    expect(update[1]).toEqual(latest)
    expect((update[2] as Date).getTime()).toBeGreaterThan(latest.getTime() + 360 * DAY)
    expect(update[3]).toBe(false)
    expect(update[4]).toBe('RCPT1')
    expect(sqlCalls(client.query, 'GREATEST')).toHaveLength(1)
    expect(sendMembershipWelcome).toHaveBeenCalledWith(MEMBERSHIP)
  })

  it('honours a founding payment that lands after the places are full and flags it', async () => {
    setup({ settleRow: { id: MEMBERSHIP, user_id: USER, price_type: 'founding' }, foundingPaid: 100 })
    expect(await settleMembershipByCheckoutId('ws_CO_1', 'RCPT1')).toBe(1)
    const update = sqlCalls(client.query, "SET status = 'paid'")[0][1] as unknown[]
    expect(update[3]).toBe(true)
  })

  it('can find the row by the account reference id when the checkout id was not saved', async () => {
    setup({ settleRow: { id: MEMBERSHIP, user_id: USER, price_type: 'standard' } })
    await settleMembershipByCheckoutId('ws_CO_1', null, MEMBERSHIP)
    expect(sqlCalls(vi.mocked(query), 'SELECT 1 FROM memberships')[0][1]).toEqual(['ws_CO_1', MEMBERSHIP])
  })

  it('ignores an account reference that is not an id', async () => {
    setup({ settleRow: null })
    await settleMembershipByCheckoutId('ws_CO_1', null, "x' OR 1=1")
    expect(sqlCalls(vi.mocked(query), 'SELECT 1 FROM memberships')[0][1]).toEqual(['ws_CO_1', null])
  })
})

describe('failMembershipByCheckoutId', () => {
  it('only fails pending rows', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 1 } as any)
    expect(await failMembershipByCheckoutId('ws_CO_1')).toBe(1)
    expect(String(vi.mocked(query).mock.calls.at(-1)![0])).toContain("status = 'pending'")
  })
})
