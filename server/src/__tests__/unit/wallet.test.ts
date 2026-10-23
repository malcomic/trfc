import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { getClient, query } from '../../config/db.js'
import {
  InsufficientFundsError,
  applyEntry,
  creditTopupByCheckoutId,
  withWallet,
} from '../../utils/wallet.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'

type Handler = (sql: string, params: any[]) => { rows: any[] } | undefined

function mockDb(handler: Handler) {
  const run = (async (sql: string, params: any[] = []) => handler(String(sql), params) ?? { rows: [] }) as any
  vi.mocked(query).mockImplementation(run)
  vi.mocked(getClient).mockImplementation((async () => ({ query: vi.fn(run), release: vi.fn() })) as any)
}

/** Just enough of the wallet tables to follow balances and one pending top-up. */
function walletState(initialBalance: number, pendingTopup?: { id: string; amount: number }) {
  const state = {
    balance: initialBalance,
    topupStatus: pendingTopup ? 'pending' : 'none',
    inserted: [] as any[],
  }
  mockDb((sql, params) => {
    if (sql.includes('INSERT INTO wallets')) return { rows: [] }
    if (sql.includes('SELECT balance::float AS balance FROM wallets')) return { rows: [{ balance: state.balance }] }
    if (sql.includes('UPDATE wallets SET balance = balance + $2')) {
      state.balance += Number(params[1])
      return { rows: [{ balance: state.balance }] }
    }
    if (sql.includes("type = 'topup' AND status = 'pending'")) {
      return { rows: state.topupStatus === 'pending' ? [{ id: pendingTopup!.id, user_id: USER_ID }] : [] }
    }
    if (sql.includes('FROM wallet_transactions') && sql.includes('FOR UPDATE')) {
      return { rows: state.topupStatus === 'pending' ? [{ amount: pendingTopup!.amount }] : [] }
    }
    if (sql.includes("SET status = 'completed'")) {
      state.topupStatus = 'completed'
      return { rows: [] }
    }
    if (sql.includes('INSERT INTO wallet_transactions')) {
      const row = { id: `tx-${state.inserted.length + 1}`, type: params[1], amount: params[2], balance_after: params[3] }
      state.inserted.push(row)
      return { rows: [row] }
    }
    return undefined
  })
  return state
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('creditTopupByCheckoutId', () => {
  it('credits a confirmed top-up only once when the callback arrives twice', async () => {
    const state = walletState(100, { id: 'topup-1', amount: 500 })

    expect(await creditTopupByCheckoutId('ws_CO_1', 'RCPT1')).toBe(1)
    expect(await creditTopupByCheckoutId('ws_CO_1', 'RCPT1')).toBe(0)

    expect(state.balance).toBe(600)
    expect(state.topupStatus).toBe('completed')
  })
})

describe('applyEntry', () => {
  it('throws InsufficientFundsError with the shortfall when overspending', async () => {
    const state = walletState(300)
    const attempt = withWallet(USER_ID, (client) =>
      applyEntry(client, USER_ID, { type: 'ticket_payment', amount: -1000, note: 'Tickets' })
    )
    await expect(attempt).rejects.toBeInstanceOf(InsufficientFundsError)
    await attempt.catch((error: InsufficientFundsError) => {
      expect(error.balance).toBe(300)
      expect(error.required).toBe(1000)
      expect(error.shortfall).toBe(700)
    })
    expect(state.balance).toBe(300)
    expect(state.inserted).toHaveLength(0)
  })

  it('only lets ticket payments, installments and admin adjustments debit the wallet', async () => {
    walletState(5000)
    for (const type of ['topup', 'cancellation_credit', 'plan_expiry_credit'] as const) {
      await expect(
        withWallet(USER_ID, (client) => applyEntry(client, USER_ID, { type, amount: -100 }))
      ).rejects.toThrow(/cannot debit/)
    }
    for (const type of ['ticket_payment', 'installment', 'adjustment'] as const) {
      await expect(
        withWallet(USER_ID, (client) => applyEntry(client, USER_ID, { type, amount: -100 }))
      ).resolves.toMatchObject({ type })
    }
  })

  it('rejects zero amounts and records the running balance', async () => {
    const state = walletState(0)
    await expect(withWallet(USER_ID, (client) => applyEntry(client, USER_ID, { type: 'topup', amount: 0 }))).rejects.toThrow()
    const tx = await withWallet(USER_ID, (client) =>
      applyEntry(client, USER_ID, { type: 'cancellation_credit', amount: 1500 })
    )
    expect(tx.balance_after).toBe(1500)
    expect(state.balance).toBe(1500)
  })

  it('rolls back the transaction when the callback throws', async () => {
    walletState(100)
    await expect(
      withWallet(USER_ID, async () => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')
    const client = await vi.mocked(getClient).mock.results[0].value
    const statements = client.query.mock.calls.map(([sql]: [string]) => sql)
    expect(statements).toContain('ROLLBACK')
    expect(statements).not.toContain('COMMIT')
  })
})
