import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { query } from '../../config/db.js'
import { clearTicketRulesCache } from '../../utils/ticketRules.js'
import {
  addCredit,
  commitHolds,
  CreditError,
  getTicketValue,
  holdCredit,
  releaseHolds,
  voidCredit,
} from '../../utils/wallet.js'
import { createFakeCreditDb } from './helpers/fakeCreditDb.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  vi.clearAllMocks()
  clearTicketRulesCache()
  vi.mocked(query).mockResolvedValue({ rows: [] } as any)
})

describe('holdCredit', () => {
  it('uses the oldest credit first and keeps the zone of the first credit used', async () => {
    const db = createFakeCreditDb([
      { id: 'old', user_id: USER_ID, remaining: 300, region_id: 'zone-thika' },
      { id: 'new', user_id: USER_ID, remaining: 1000, region_id: 'zone-juja' },
    ])
    const client = { query: vi.fn(db.run) } as any

    const result = await holdCredit(client, USER_ID, { maxAmount: 500, purchaseBatchId: 'batch-1' })

    expect(result).toEqual({ held: 500, regionId: 'zone-thika' })
    expect(db.state.holds.map((h) => [h.credit_id, h.amount])).toEqual([
      ['old', 300],
      ['new', 200],
    ])
  })

  it('holds only what is free and nothing for a zero amount', async () => {
    const db = createFakeCreditDb([{ id: 'c1', user_id: USER_ID, remaining: 400 }])
    const client = { query: vi.fn(db.run) } as any

    expect(await holdCredit(client, USER_ID, { maxAmount: 0 })).toEqual({ held: 0, regionId: null })
    expect(await holdCredit(client, USER_ID, { maxAmount: 1497, purchaseBatchId: 'b' })).toMatchObject({ held: 400 })
    // Held credit is not available to a second payment.
    expect(await holdCredit(client, USER_ID, { maxAmount: 100, purchaseBatchId: 'c' })).toMatchObject({ held: 0 })
  })
})

describe('commitHolds and releaseHolds', () => {
  it('spends held credit and writes one history row for the total', async () => {
    const db = createFakeCreditDb([
      { id: 'a', user_id: USER_ID, remaining: 300 },
      { id: 'b', user_id: USER_ID, remaining: 1000 },
    ])
    const client = { query: vi.fn(db.run) } as any
    await holdCredit(client, USER_ID, { maxAmount: 500, purchaseBatchId: 'batch-1' })

    const spent = await commitHolds(client, USER_ID, { purchaseBatchId: 'batch-1' }, { note: '1 ticket for Run' })

    expect(spent).toEqual({ amount: 500, txId: 'tx-1' })
    expect(db.state.credits.map((c) => [c.id, c.remaining, c.status])).toEqual([
      ['a', 0, 'used'],
      ['b', 800, 'active'],
    ])
    expect(db.state.ledger).toEqual([{ id: 'tx-1', type: 'credit_used', amount: -500, mpesa_amount: undefined }])
  })

  it('gives held credit back when a payment fails', async () => {
    const db = createFakeCreditDb([{ id: 'a', user_id: USER_ID, remaining: 300 }])
    const client = { query: vi.fn(db.run) } as any
    await holdCredit(client, USER_ID, { maxAmount: 300, paymentTxId: 'tx-9' })

    expect(await releaseHolds(client, { paymentTxId: 'tx-9' })).toBe(300)
    expect(await holdCredit(client, USER_ID, { maxAmount: 300, purchaseBatchId: 'x' })).toMatchObject({ held: 300 })
  })
})

describe('addCredit', () => {
  it('expires 60 days after the event at 11:59 pm Nairobi (31 Oct event -> 30 Dec)', async () => {
    const db = createFakeCreditDb([])
    const client = {
      query: vi.fn(async (sql: string, params: any[]) =>
        sql.includes('INSERT INTO ticket_credits') ? { rows: [{ id: 'credit-1' }] } : db.run(sql, params)
      ),
    } as any

    const added = await addCredit(client, USER_ID, { amount: 1497, reason: 'no_show', eventDay: '2026-10-31' })

    expect(added?.expiresAt.toISOString()).toBe('2026-12-30T20:59:59.000Z')
    expect(db.state.ledger[0]).toMatchObject({ type: 'credit_added', amount: 1497 })
  })

  it('ignores zero amounts', async () => {
    const client = { query: vi.fn() } as any
    expect(await addCredit(client, USER_ID, { amount: 0, reason: 'admin' })).toBeNull()
    expect(client.query).not.toHaveBeenCalled()
  })
})

describe('voidCredit', () => {
  it('refuses a credit that was partly spent', async () => {
    const client = {
      query: vi.fn(async () => ({ rows: [{ amount: 1497, remaining: 497, status: 'active', has_hold: false }] })),
    } as any
    await expect(voidCredit(client, USER_ID, 'c1', { note: 'Marked present' })).rejects.toBeInstanceOf(CreditError)
  })

  it('voids an unused credit', async () => {
    const calls: string[] = []
    const client = {
      query: vi.fn(async (sql: string) => {
        calls.push(sql)
        if (sql.includes('FROM ticket_credits c WHERE c.id')) {
          return { rows: [{ amount: 1497, remaining: 1497, status: 'active', has_hold: false }] }
        }
        if (sql.includes('UPDATE wallets')) return { rows: [{ balance: 0 }] }
        if (sql.includes('INSERT INTO wallet_transactions')) return { rows: [{ id: 'tx-1' }] }
        return { rows: [] }
      }),
    } as any
    expect(await voidCredit(client, USER_ID, 'c1', { note: 'Marked present' })).toBe(1497)
    expect(calls.some((sql) => sql.includes("SET status = 'voided'"))).toBe(true)
  })
})

describe('getTicketValue', () => {
  it('counts only available credit, minus held amounts, and shows upcoming credit separately', async () => {
    const now = new Date('2026-11-05T09:00:00Z')
    vi.mocked(query).mockResolvedValue({
      rows: [
        { id: 'a', remaining: 1000, held: 200, available_from: '2026-11-01T03:00:00Z', expires_at: '2026-12-30T20:59:59Z' },
        { id: 'b', remaining: 500, held: 0, available_from: '2026-11-06T03:00:00Z', expires_at: '2027-01-04T20:59:59Z' },
      ],
    } as any)

    const value = await getTicketValue(USER_ID, now)

    expect(value.ticketValue).toBe(800)
    expect(value.upcoming).toBe(500)
    expect(value.credits[0]).toMatchObject({ available: true, days_left: 56 })
    expect(value.credits[1]).toMatchObject({ available: false })
  })
})
