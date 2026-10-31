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
import { recordCaptainCommissionsForCheckout } from '../../utils/captainCommissions.js'
import { startMpesaForTx } from '../../utils/walletMpesa.js'
import { WalletCheckoutError, payBatchesWithCredit } from '../../utils/walletCheckout.js'
import { createFakeCreditDb, type FakeCredit } from './helpers/fakeCreditDb.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_ID = '44444444-4444-4444-8444-444444444444'

const ticket = (overrides: Record<string, unknown> = {}) => ({
  id: `t-${Math.random()}`,
  user_id: USER_ID,
  payment_status: 'pending',
  checkout_request_id: null,
  price: 1497,
  event_title: 'Ngong Hills Hike',
  upcoming: true,
  cancelled_at: null,
  ...overrides,
})

function setup(credits: FakeCredit[], batches: Record<string, any[]>) {
  const db = createFakeCreditDb(credits, batches)
  vi.mocked(query).mockImplementation(db.run as any)
  vi.mocked(getClient).mockImplementation((async () => ({ query: vi.fn(db.run), release: vi.fn() })) as any)
  return db
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('payBatchesWithCredit', () => {
  it('pays from ticket value when it covers the bookings, oldest credit first', async () => {
    const db = setup(
      [
        { id: 'old', user_id: USER_ID, remaining: 1000, region_id: 'zone-thika' },
        { id: 'new', user_id: USER_ID, remaining: 2000 },
      ],
      { A: [ticket()] }
    )

    const result = await payBatchesWithCredit(USER_ID, { batchIds: ['A'] })

    expect(result).toEqual({ status: 'paid', references: ['WALLET-tx-1'], total: 1497, creditUsed: 1497 })
    expect(db.state.credits.map((c) => c.remaining)).toEqual([0, 1503])
    expect(db.state.regionUpdates).toEqual([['A', 'zone-thika']])
    expect(db.state.paidTickets).toEqual([['WALLET-tx-1', 'A']])
    expect(recordCaptainCommissionsForCheckout).toHaveBeenCalledWith('WALLET-tx-1')
    expect(sendTicketBatchEmail).toHaveBeenCalledWith('WALLET-tx-1')
    expect(startMpesaForTx).not.toHaveBeenCalled()
  })

  it('holds the credit and asks M-Pesa for the difference', async () => {
    vi.mocked(startMpesaForTx).mockResolvedValue({ checkoutRequestId: 'ws_CO_1', customerMessage: 'ok' } as any)
    const db = setup([{ id: 'c1', user_id: USER_ID, remaining: 1000 }], { A: [ticket()] })

    const result = await payBatchesWithCredit(USER_ID, { batchIds: ['A'], phone: '254712345678' })

    expect(result).toMatchObject({ status: 'mpesa', checkoutRequestId: 'ws_CO_1', creditUsed: 1000, mpesaAmount: 497 })
    expect(startMpesaForTx).toHaveBeenCalledWith('tx-1', '254712345678', 497, 'WALLET-tx-1')
    expect(db.state.ledger[0]).toMatchObject({ type: 'ticket_payment_mpesa', amount: 0, mpesa_amount: 497 })
    expect(db.state.holds).toEqual([expect.objectContaining({ status: 'held', amount: 1000, payment_tx_id: 'tx-1' })])
    expect(db.state.credits[0].remaining).toBe(1000)
    expect(db.state.paidTickets).toHaveLength(0)
  })

  it('releases the held credit when M-Pesa cannot be started', async () => {
    vi.mocked(startMpesaForTx).mockRejectedValue(new Error('M-Pesa down'))
    const db = setup([{ id: 'c1', user_id: USER_ID, remaining: 1000 }], { A: [ticket()] })

    await expect(payBatchesWithCredit(USER_ID, { batchIds: ['A'], phone: '254712345678' })).rejects.toThrow('M-Pesa down')
    expect(db.state.holds[0].status).toBe('released')
  })

  it('pays fully by M-Pesa when the member chooses not to use ticket value', async () => {
    vi.mocked(startMpesaForTx).mockResolvedValue({ checkoutRequestId: 'ws_CO_2' } as any)
    const db = setup([{ id: 'c1', user_id: USER_ID, remaining: 5000 }], { A: [ticket()] })

    const result = await payBatchesWithCredit(USER_ID, { batchIds: ['A'], phone: '254712345678', useCredit: false })

    expect(result).toMatchObject({ status: 'mpesa', creditUsed: 0, mpesaAmount: 1497 })
    expect(db.state.holds).toHaveLength(0)
  })

  it('needs a phone number when ticket value does not cover the total', async () => {
    setup([], { A: [ticket()] })
    await expect(payBatchesWithCredit(USER_ID, { batchIds: ['A'] })).rejects.toBeInstanceOf(WalletCheckoutError)
  })

  it('rejects a booking that belongs to someone else', async () => {
    setup([], { A: [ticket({ user_id: OTHER_ID })] })
    await expect(payBatchesWithCredit(USER_ID, { batchIds: ['A'] })).rejects.toMatchObject({ status: 404 })
  })

  it('refuses bookings with an M-Pesa payment already started, past events and cancelled events', async () => {
    setup([], { A: [ticket({ checkout_request_id: 'ws_CO_123' })] })
    await expect(payBatchesWithCredit(USER_ID, { batchIds: ['A'] })).rejects.toMatchObject({ status: 409 })
    setup([], { A: [ticket({ upcoming: false })] })
    await expect(payBatchesWithCredit(USER_ID, { batchIds: ['A'] })).rejects.toMatchObject({ status: 409 })
    setup([], { A: [ticket({ cancelled_at: '2026-10-01' })] })
    await expect(payBatchesWithCredit(USER_ID, { batchIds: ['A'] })).rejects.toMatchObject({ status: 409 })
  })
})
