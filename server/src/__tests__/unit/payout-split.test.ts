import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { query } from '../../config/db.js'
import { loadZoneCaptains, splitEqually } from '../../utils/payoutSplit.js'

const captain = (id: string, isLead = false) => ({ captainId: id, isLead })

describe('splitEqually', () => {
  it('gives two captains half each', () => {
    expect(splitEqually(1000, [captain('a', true), captain('b')]).map((s) => s.amount)).toEqual([500, 500])
  })

  it('gives the leftover shillings to the lead captain', () => {
    const shares = splitEqually(1000, [captain('a'), captain('b', true), captain('c')])
    expect(shares.map((s) => s.amount)).toEqual([333, 334, 333])
    expect(shares.reduce((sum, s) => sum + s.amount, 0)).toBe(1000)
  })

  it('pays whole shillings and gives any cents to the lead captain', () => {
    const shares = splitEqually(150.5, [captain('a', true), captain('b')])
    expect(shares.map((s) => s.amount)).toEqual([75.5, 75])
  })

  it('gives the leftover to the first captain when the zone has no lead', () => {
    expect(splitEqually(101, [captain('a'), captain('b')]).map((s) => s.amount)).toEqual([51, 50])
  })

  it('gives one captain everything and an empty zone nothing', () => {
    expect(splitEqually(999.99, [captain('a')]).map((s) => s.amount)).toEqual([999.99])
    expect(splitEqually(500, [])).toEqual([])
  })
})

describe('loadZoneCaptains', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads active captains, lead first, using the payout phone when set', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        { user_id: 'a', name: 'Amina', email: 'a@x.com', phone: '254700000001', is_lead: true },
        { user_id: 'b', name: 'Brian', email: null, phone: null, is_lead: false },
      ],
    } as any)

    const captains = await loadZoneCaptains('zone-1')

    const [sql, params] = vi.mocked(query).mock.calls[0]
    expect(String(sql)).toContain("c.status = 'active'")
    expect(String(sql)).toContain("COALESCE(NULLIF(c.payout_phone, ''), u.phone)")
    expect(String(sql)).toContain('ORDER BY is_lead DESC, c.created_at ASC')
    expect(params).toEqual(['zone-1'])
    expect(captains).toEqual([
      { captainId: 'a', name: 'Amina', email: 'a@x.com', phone: '254700000001', isLead: true },
      { captainId: 'b', name: 'Brian', email: null, phone: null, isLead: false },
    ])
  })
})
