import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { getClient, query } from '../../config/db.js'
import {
  DEFAULT_WALLET_LIMIT_SETTINGS,
  WalletLimitError,
  clearWalletLimitCache,
  computeCap,
  getWalletLimit,
  headroomFor,
  reserveTopup,
} from '../../utils/walletLimit.js'
import { parseWalletLimitSettings } from '../../controllers/adminWalletsController.js'

const USER_ID = '33333333-3333-4333-8333-333333333333'

interface DbState {
  balance: number
  /** Sum of each upcoming event's highest active ticket price. */
  eventsBase: number
  pending: number
  inserted: any[]
}

function mockDb(initial: Partial<DbState> = {}) {
  const state: DbState = { balance: 0, eventsBase: 0, pending: 0, inserted: [], ...initial }
  const run = (async (sql: string, params: any[] = []) => {
    if (sql.includes('FROM wallet_settings')) {
      return {
        rows: [
          {
            cap_multiplier: DEFAULT_WALLET_LIMIT_SETTINGS.capMultiplier,
            tickets_per_event: DEFAULT_WALLET_LIMIT_SETTINGS.ticketsPerEvent,
            cap_floor: DEFAULT_WALLET_LIMIT_SETTINGS.capFloor,
            cap_ceiling: DEFAULT_WALLET_LIMIT_SETTINGS.capCeiling,
          },
        ],
      }
    }
    if (sql.includes('FROM event_ticket_types') || sql.includes('MAX(t.price)')) return { rows: [{ base: state.eventsBase }] }
    if (sql.includes('SELECT balance::float AS balance FROM wallets')) return { rows: [{ balance: state.balance }] }
    if (sql.includes("status = 'pending'") && sql.includes('SUM(amount)')) return { rows: [{ pending: state.pending }] }
    if (sql.includes('INSERT INTO wallet_transactions')) {
      state.inserted.push({ amount: params[1] })
      state.pending += Number(params[1])
      return { rows: [{ id: `tx-${state.inserted.length}` }] }
    }
    return { rows: [] }
  }) as any
  vi.mocked(query).mockImplementation(run)
  vi.mocked(getClient).mockImplementation((async () => ({ query: vi.fn(run), release: vi.fn() })) as any)
  return state
}

beforeEach(() => {
  vi.clearAllMocks()
  clearWalletLimitCache()
})

describe('computeCap', () => {
  const settings = DEFAULT_WALLET_LIMIT_SETTINGS

  it('falls back to the minimum when no events are upcoming', () => {
    expect(computeCap(settings, 0)).toBe(5000)
  })

  it('applies the multiplier between the minimum and maximum', () => {
    expect(computeCap(settings, 10_000)).toBe(15_000)
  })

  it('never exceeds the maximum', () => {
    expect(computeCap(settings, 1_000_000)).toBe(100_000)
  })
})

describe('getWalletLimit', () => {
  it('multiplies each event top price by tickets per event before applying the multiplier', async () => {
    mockDb({ eventsBase: 2500 })
    const limit = await getWalletLimit()
    expect(limit.base).toBe(10_000)
    expect(limit.cap).toBe(15_000)
  })
})

describe('headroomFor', () => {
  it('is zero rather than negative when a refund pushed the balance above the cap', () => {
    expect(headroomFor(5000, 7000, 0)).toBe(0)
  })

  it('subtracts unconfirmed top-ups', () => {
    expect(headroomFor(15_000, 4000, 1000)).toBe(10_000)
  })
})

describe('reserveTopup', () => {
  it('records a pending top-up within the limit', async () => {
    const state = mockDb({ eventsBase: 2500, balance: 4000 })
    const result = await reserveTopup(USER_ID, { amount: 6000, phone: '254700000000', note: 'M-Pesa top-up' })
    expect(result).toMatchObject({ txId: 'tx-1', cap: 15_000, headroom: 5000 })
    expect(state.inserted).toEqual([{ amount: 6000 }])
  })

  it('rejects a top-up above the remaining room and records nothing', async () => {
    const state = mockDb({ eventsBase: 2500, balance: 4000, pending: 1000 })
    const attempt = reserveTopup(USER_ID, { amount: 10_001, phone: '254700000000', note: 'M-Pesa top-up' })
    await expect(attempt).rejects.toBeInstanceOf(WalletLimitError)
    await attempt.catch((error: WalletLimitError) => {
      expect(error.cap).toBe(15_000)
      expect(error.headroom).toBe(10_000)
    })
    expect(state.inserted).toHaveLength(0)
  })

  it('counts an earlier pending top-up so two prompts cannot both pass', async () => {
    mockDb({ eventsBase: 0, balance: 0 })
    await reserveTopup(USER_ID, { amount: 4000, phone: '254700000000', note: 'M-Pesa top-up' })
    await expect(
      reserveTopup(USER_ID, { amount: 4000, phone: '254700000000', note: 'M-Pesa top-up' })
    ).rejects.toBeInstanceOf(WalletLimitError)
  })
})

describe('parseWalletLimitSettings', () => {
  const valid = { capMultiplier: 1.5, ticketsPerEvent: 4, capFloor: 5000, capCeiling: 100_000 }

  it('accepts valid settings', () => {
    expect(parseWalletLimitSettings(valid)).toEqual(valid)
  })

  it('rejects a maximum below the minimum', () => {
    expect(parseWalletLimitSettings({ ...valid, capCeiling: 1000 })).toMatch(/at least the minimum/)
  })

  it('rejects a multiplier below 1 and fractional tickets per event', () => {
    expect(parseWalletLimitSettings({ ...valid, capMultiplier: 0.5 })).toMatch(/Multiplier/)
    expect(parseWalletLimitSettings({ ...valid, ticketsPerEvent: 2.5 })).toMatch(/Tickets per event/)
  })
})
