import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))
vi.mock('../../utils/ticketEmail.js', () => ({
  sendTicketBatchEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../utils/medalEmail.js', () => ({
  sendMedalBatchEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../utils/orderEmail.js', () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../utils/orderStock.js', () => ({
  decrementOrderStock: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../utils/captainCommissions.js', () => ({
  recordCaptainCommissionsForCheckout: vi.fn().mockResolvedValue(0),
  recordCaptainCommission: vi.fn().mockResolvedValue(true),
  recordCaptainCommissionsForMedalBatch: vi.fn().mockResolvedValue(1),
}))
vi.mock('../../utils/metaConversions.js', () => ({
  reportMetaPurchase: vi.fn(),
  saveMetaContext: vi.fn(),
}))
vi.mock('../../utils/walletMpesa.js', () => ({
  startMpesaForTx: vi.fn(),
}))

import { getClient, query } from '../../config/db.js'
import { sendOrderConfirmationEmail } from '../../utils/orderEmail.js'
import { sendMedalBatchEmail } from '../../utils/medalEmail.js'
import { decrementOrderStock } from '../../utils/orderStock.js'
import { recordCaptainCommission, recordCaptainCommissionsForMedalBatch } from '../../utils/captainCommissions.js'
import { startMpesaForTx } from '../../utils/walletMpesa.js'
import { payMedalBatchWithCredit, payOrderWithCredit } from '../../utils/walletCheckout.js'
import { createFakeCreditDb, type FakeCredit } from './helpers/fakeCreditDb.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_ID = '44444444-4444-4444-8444-444444444444'
const ORDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const MEDAL_BATCH = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function setup(
  credits: FakeCredit[],
  extras: { orders?: Record<string, any>; medalBatches?: Record<string, any[]> } = {}
) {
  const db = createFakeCreditDb(credits, {}, extras)
  vi.mocked(query).mockImplementation(db.run as any)
  vi.mocked(getClient).mockImplementation((async () => ({ query: vi.fn(db.run), release: vi.fn() })) as any)
  return db
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('payOrderWithCredit', () => {
  const pendingOrder = {
    id: ORDER_ID,
    user_id: USER_ID,
    payment_status: 'pending',
    checkout_request_id: null,
    total_amount: 2500,
  }

  it('pays a shop order fully from ticket value', async () => {
    const db = setup([{ id: 'c1', user_id: USER_ID, remaining: 3000 }], { orders: { [ORDER_ID]: { ...pendingOrder } } })

    const result = await payOrderWithCredit(USER_ID, { orderId: ORDER_ID })

    expect(result).toEqual({ status: 'paid', references: ['WALLET-tx-1'], total: 2500, creditUsed: 2500 })
    expect(db.state.credits[0].remaining).toBe(500)
    expect(decrementOrderStock).toHaveBeenCalledWith(ORDER_ID)
    expect(recordCaptainCommission).toHaveBeenCalledWith('order', ORDER_ID)
    expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(ORDER_ID)
    expect(startMpesaForTx).not.toHaveBeenCalled()
  })

  it('holds credit and asks M-Pesa for the shop remainder', async () => {
    vi.mocked(startMpesaForTx).mockResolvedValue({ checkoutRequestId: 'ws_CO_order', customerMessage: 'ok' } as any)
    const db = setup([{ id: 'c1', user_id: USER_ID, remaining: 1000 }], { orders: { [ORDER_ID]: { ...pendingOrder } } })

    const result = await payOrderWithCredit(USER_ID, { orderId: ORDER_ID, phone: '254712345678' })

    expect(result).toMatchObject({
      status: 'mpesa',
      checkoutRequestId: 'ws_CO_order',
      creditUsed: 1000,
      mpesaAmount: 1500,
    })
    expect(startMpesaForTx).toHaveBeenCalledWith('tx-1', '254712345678', 1500, 'WALLET-tx-1')
    expect(db.state.ledger[0]).toMatchObject({ type: 'order_payment_mpesa', mpesa_amount: 1500 })
    expect(db.state.holds[0]).toMatchObject({ status: 'held', order_id: ORDER_ID, payment_tx_id: 'tx-1' })
    expect(decrementOrderStock).not.toHaveBeenCalled()
  })

  it('releases held credit when M-Pesa cannot start for an order', async () => {
    vi.mocked(startMpesaForTx).mockRejectedValue(new Error('M-Pesa down'))
    const db = setup([{ id: 'c1', user_id: USER_ID, remaining: 1000 }], { orders: { [ORDER_ID]: { ...pendingOrder } } })

    await expect(payOrderWithCredit(USER_ID, { orderId: ORDER_ID, phone: '254712345678' })).rejects.toThrow('M-Pesa down')
    expect(db.state.holds[0].status).toBe('released')
  })

  it("rejects another member's order", async () => {
    setup([], { orders: { [ORDER_ID]: { ...pendingOrder, user_id: OTHER_ID } } })
    await expect(payOrderWithCredit(USER_ID, { orderId: ORDER_ID })).rejects.toMatchObject({ status: 404 })
  })
})

describe('payMedalBatchWithCredit', () => {
  const medalRow = (id: string) => ({
    id,
    user_id: USER_ID,
    payment_status: 'pending',
    checkout_request_id: null,
    price: 1500,
    tier_name: 'Finisher',
  })

  it('pays a medal batch fully from ticket value', async () => {
    const db = setup([{ id: 'c1', user_id: USER_ID, remaining: 4000 }], {
      medalBatches: { [MEDAL_BATCH]: [medalRow('medal-1'), medalRow('medal-2')] },
    })

    const result = await payMedalBatchWithCredit(USER_ID, { medalBatchId: MEDAL_BATCH })

    expect(result).toEqual({ status: 'paid', references: ['WALLET-tx-1'], total: 3000, creditUsed: 3000 })
    expect(db.state.credits[0].remaining).toBe(1000)
    expect(recordCaptainCommissionsForMedalBatch).toHaveBeenCalledWith(MEDAL_BATCH)
    expect(sendMedalBatchEmail).toHaveBeenCalledWith('WALLET-tx-1')
    expect(startMpesaForTx).not.toHaveBeenCalled()
  })

  it('holds credit and asks M-Pesa for the medal remainder', async () => {
    vi.mocked(startMpesaForTx).mockResolvedValue({ checkoutRequestId: 'ws_CO_medal', customerMessage: 'ok' } as any)
    const db = setup([{ id: 'c1', user_id: USER_ID, remaining: 500 }], {
      medalBatches: { [MEDAL_BATCH]: [medalRow('medal-1')] },
    })

    const result = await payMedalBatchWithCredit(USER_ID, { medalBatchId: MEDAL_BATCH, phone: '254712345678' })

    expect(result).toMatchObject({
      status: 'mpesa',
      checkoutRequestId: 'ws_CO_medal',
      creditUsed: 500,
      mpesaAmount: 1000,
    })
    expect(db.state.holds[0]).toMatchObject({ status: 'held', medal_batch_id: MEDAL_BATCH, payment_tx_id: 'tx-1' })
    expect(db.state.ledger[0]).toMatchObject({ type: 'medal_payment_mpesa', mpesa_amount: 1000 })
  })

  it('releases held credit when M-Pesa cannot start for medals', async () => {
    vi.mocked(startMpesaForTx).mockRejectedValue(new Error('M-Pesa down'))
    const db = setup([{ id: 'c1', user_id: USER_ID, remaining: 500 }], {
      medalBatches: { [MEDAL_BATCH]: [medalRow('medal-1')] },
    })

    await expect(
      payMedalBatchWithCredit(USER_ID, { medalBatchId: MEDAL_BATCH, phone: '254712345678' })
    ).rejects.toThrow('M-Pesa down')
    expect(db.state.holds[0].status).toBe('released')
  })
})
