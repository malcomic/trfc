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
import { startMpesaForTx } from '../../utils/walletMpesa.js'
import { movePlanToEvent } from '../../utils/installments.js'
import { clearTicketRulesCache } from '../../utils/ticketRules.js'
import { createFakeCreditDb } from './helpers/fakeCreditDb.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const PLAN_ID = '33333333-3333-4333-8333-333333333333'

beforeEach(() => {
  vi.clearAllMocks()
  clearTicketRulesCache()
})

/** A plan for "Ngong Hills Hike" with KSh 450 paid, and a new pending booking 'batch-new'. */
function moveDb(opts: { existingCredit?: number; newPrice: number; newEventId?: string }) {
  const credits = opts.existingCredit ? [{ id: 'c-old', user_id: USER_ID, remaining: opts.existingCredit }] : []
  const db = createFakeCreditDb(credits, {
    'batch-new': [
      {
        id: 't-new',
        user_id: USER_ID,
        event_id: opts.newEventId ?? 'ev-2',
        payment_status: 'pending',
        checkout_request_id: null,
        price: opts.newPrice,
        event_title: 'Kereita Forest Run',
        upcoming: true,
        cancelled_at: null,
      },
    ],
  })
  const calls: [string, any[]][] = []
  const run = async (sql: string, params: any[] = []) => {
    calls.push([sql, params])
    if (sql.includes('p.deadline_at') && sql.includes('FOR UPDATE OF p')) {
      return {
        rows: [
          {
            id: PLAN_ID,
            user_id: USER_ID,
            status: 'active',
            deadline_at: '2099-01-01T00:00:00Z',
            total_amount: 1497,
            amount_paid: 450,
            event_title: 'Ngong Hills Hike',
          },
        ],
      }
    }
    if (sql.includes('SELECT 1 FROM wallet_transactions')) return { rows: [] }
    if (sql.includes('SELECT event_id FROM ticket_payment_plans')) return { rows: [{ event_id: 'ev-1' }] }
    if (sql.includes('to_char(e.event_date') && sql.includes('FOR UPDATE OF p')) {
      return {
        rows: [
          {
            user_id: USER_ID,
            event_id: 'ev-1',
            purchase_batch_id: 'batch-old',
            status: 'active',
            amount_paid: 450,
            event_title: 'Ngong Hills Hike',
            event_day: '2026-12-12',
          },
        ],
      }
    }
    if (sql.includes("UPDATE tickets SET payment_status = 'cancelled'")) return { rows: [{ referral_region_id: null }] }
    if (sql.includes('INSERT INTO ticket_credits')) {
      db.state.credits.push({
        id: 'c-moved',
        user_id: USER_ID,
        remaining: Number(params[6]),
        amount: Number(params[6]),
        region_id: null,
        status: 'active',
        available: true,
      })
      return { rows: [{ id: 'c-moved' }] }
    }
    return db.run(sql, params)
  }
  vi.mocked(query).mockImplementation(run as any)
  vi.mocked(getClient).mockImplementation((async () => ({ query: vi.fn(run), release: vi.fn() })) as any)
  return { db, calls }
}

const statusUpdate = (calls: [string, any[]][]) =>
  calls.find(([sql]) => sql.includes('UPDATE ticket_payment_plans SET status = $2'))?.[1]

describe('movePlanToEvent', () => {
  it('releases the old seat, turns what was paid into ticket value and uses it (with older value) on the new booking', async () => {
    vi.mocked(startMpesaForTx).mockResolvedValue({ checkoutRequestId: 'ws_CO_1', customerMessage: 'Sent' } as any)
    const { db, calls } = moveDb({ existingCredit: 200, newPrice: 1000 })

    const result = await movePlanToEvent(PLAN_ID, USER_ID, { purchaseBatchId: 'batch-new', phone: '254712345678' })

    expect(result).toMatchObject({
      status: 'mpesa',
      checkoutRequestId: 'ws_CO_1',
      creditUsed: 650,
      mpesaAmount: 350,
      moved: 450,
      fromEvent: 'Ngong Hills Hike',
    })
    expect(statusUpdate(calls)).toEqual([PLAN_ID, 'moved'])
    const credit = calls.find(([sql]) => sql.includes('INSERT INTO ticket_credits'))!
    expect(credit[1][4]).toBe('moved')
    expect(db.state.holds.filter((h) => h.status === 'held').map((h) => [h.credit_id, h.amount])).toEqual([
      ['c-old', 200],
      ['c-moved', 450],
    ])
    expect(startMpesaForTx).toHaveBeenCalledWith(expect.any(String), '254712345678', 350, expect.stringMatching(/^WALLET-/))
  })

  it('pays the new booking outright when the moved value covers it, leaving the rest as ticket value', async () => {
    const { db } = moveDb({ newPrice: 400 })

    const result = await movePlanToEvent(PLAN_ID, USER_ID, { purchaseBatchId: 'batch-new' })

    expect(result).toMatchObject({ status: 'paid', creditUsed: 400, moved: 450 })
    expect(db.state.paidTickets).toHaveLength(1)
    expect(db.state.credits.find((c) => c.id === 'c-moved')?.remaining).toBe(50)
    expect(startMpesaForTx).not.toHaveBeenCalled()
  })

  it('refuses to move to the same event and leaves the plan untouched', async () => {
    const { calls } = moveDb({ newPrice: 400, newEventId: 'ev-1' })

    await expect(movePlanToEvent(PLAN_ID, USER_ID, { purchaseBatchId: 'batch-new' })).rejects.toThrow('different event')
    expect(statusUpdate(calls)).toBeUndefined()
  })
})
