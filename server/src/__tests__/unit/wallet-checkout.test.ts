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

import { getClient, query } from '../../config/db.js'
import { sendTicketBatchEmail } from '../../utils/ticketEmail.js'
import { recordCaptainCommissionsForCheckout } from '../../utils/captainCommissions.js'
import { InsufficientFundsError } from '../../utils/wallet.js'
import { WalletCheckoutError, payBatchesFromWallet } from '../../utils/walletCheckout.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_ID = '44444444-4444-4444-8444-444444444444'

const ticket = (overrides: Record<string, unknown> = {}) => ({
  id: `t-${Math.random()}`,
  user_id: USER_ID,
  payment_status: 'pending',
  checkout_request_id: null,
  price: 1000,
  event_title: 'Thika Road 10K',
  upcoming: true,
  ...overrides,
})

function setup(balance: number, batches: Record<string, any[]>) {
  const state = { balance, ticketUpdates: [] as any[][], txCount: 0 }
  const run = (async (sql: string, params: any[] = []) => {
    if (sql.includes('SELECT balance::float AS balance FROM wallets')) return { rows: [{ balance: state.balance }] }
    if (sql.includes('UPDATE wallets SET balance = balance + $2')) {
      state.balance += Number(params[1])
      return { rows: [{ balance: state.balance }] }
    }
    if (sql.includes('WHERE t.purchase_batch_id = $1')) return { rows: batches[params[0]] ?? [] }
    if (sql.includes('INSERT INTO wallet_transactions')) {
      state.txCount++
      return { rows: [{ id: `tx-${state.txCount}`, amount: params[2], balance_after: params[3] }] }
    }
    if (sql.includes("UPDATE tickets SET payment_status = 'paid'")) {
      state.ticketUpdates.push(params)
      return { rows: [] }
    }
    return { rows: [] }
  }) as any
  vi.mocked(query).mockImplementation(run)
  vi.mocked(getClient).mockImplementation((async () => ({ query: vi.fn(run), release: vi.fn() })) as any)
  return state
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('payBatchesFromWallet', () => {
  it('pays several bookings at once, debiting the combined total and issuing each batch', async () => {
    const state = setup(5000, {
      A: [ticket(), ticket()],
      B: [ticket({ price: 1500, event_title: 'Night Ride' })],
    })

    const result = await payBatchesFromWallet(USER_ID, ['A', 'B'])

    expect(result.total).toBe(3500)
    expect(result.balance).toBe(1500)
    expect(state.balance).toBe(1500)
    expect(result.references).toEqual(['WALLET-tx-1', 'WALLET-tx-2'])
    expect(state.ticketUpdates).toEqual([
      ['WALLET-tx-1', 'A'],
      ['WALLET-tx-2', 'B'],
    ])
    expect(recordCaptainCommissionsForCheckout).toHaveBeenCalledWith('WALLET-tx-1')
    expect(sendTicketBatchEmail).toHaveBeenCalledWith('WALLET-tx-2')
  })

  it('pays nothing when the balance does not cover every selected booking', async () => {
    const state = setup(1000, { A: [ticket(), ticket()], B: [ticket({ price: 1500 })] })

    const attempt = payBatchesFromWallet(USER_ID, ['A', 'B'])
    await expect(attempt).rejects.toBeInstanceOf(InsufficientFundsError)
    await attempt.catch((error: InsufficientFundsError) => expect(error.shortfall).toBe(2500))
    expect(state.ticketUpdates).toHaveLength(0)
    expect(state.balance).toBe(1000)
  })

  it("rejects a booking that belongs to someone else", async () => {
    const state = setup(5000, { A: [ticket({ user_id: OTHER_ID })] })
    await expect(payBatchesFromWallet(USER_ID, ['A'])).rejects.toMatchObject({
      constructor: WalletCheckoutError,
      status: 404,
    })
    expect(state.ticketUpdates).toHaveLength(0)
  })

  it('refuses a booking that already has an M-Pesa payment started', async () => {
    setup(5000, { A: [ticket({ checkout_request_id: 'ws_CO_123' })] })
    await expect(payBatchesFromWallet(USER_ID, ['A'])).rejects.toMatchObject({ status: 409 })
  })

  it('refuses bookings for events that have already happened', async () => {
    setup(5000, { A: [ticket({ upcoming: false })] })
    await expect(payBatchesFromWallet(USER_ID, ['A'])).rejects.toMatchObject({ status: 409 })
  })
})
