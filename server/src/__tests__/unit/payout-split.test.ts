import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { query } from '../../config/db.js'
import {
  buildCaptainTicketWeights,
  loadZoneCaptains,
  loadZoneTicketAttribution,
  splitByWeights,
  splitEqually,
  splitZonePayoutAmount,
} from '../../utils/payoutSplit.js'

const captain = (id: string, isLead = false) => ({
  captainId: id,
  name: id,
  email: null,
  phone: null,
  isLead,
})

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

describe('splitByWeights', () => {
  it('splits 2:1 with leftover to the lead', () => {
    const shares = splitByWeights(300, [
      { ...captain('a', true), weight: 2 },
      { ...captain('b'), weight: 1 },
    ])
    expect(shares.map((s) => s.amount)).toEqual([200, 100])
  })

  it('gives zero to a captain with weight 0', () => {
    const shares = splitByWeights(100, [
      { ...captain('a', true), weight: 1 },
      { ...captain('b'), weight: 0 },
    ])
    expect(shares.map((s) => ({ id: s.captainId, amount: s.amount }))).toEqual([
      { id: 'a', amount: 100 },
      { id: 'b', amount: 0 },
    ])
  })

  it('gives leftover shillings to the lead among weighted captains', () => {
    const shares = splitByWeights(100, [
      { ...captain('a'), weight: 1 },
      { ...captain('b', true), weight: 1 },
      { ...captain('c'), weight: 1 },
    ])
    expect(shares.map((s) => s.amount)).toEqual([33, 34, 33])
    expect(shares.reduce((sum, s) => sum + s.amount, 0)).toBe(100)
  })

  it('rejects when every weight is zero', () => {
    expect(() => splitByWeights(100, [{ ...captain('a'), weight: 0 }])).toThrow(/positive weight/)
  })
})

describe('buildCaptainTicketWeights', () => {
  const captains = [captain('a', true), captain('b'), captain('c')]

  it('redistributes unallocated tickets among captains who have credited tickets', () => {
    const weights = buildCaptainTicketWeights(captains, [
      { captain_id: 'a', tickets: 2 },
      { captain_id: 'b', tickets: 1 },
      { captain_id: null, tickets: 3 },
    ])
    expect(weights).not.toBeNull()
    // 3 unallocated: floor(3*2/3)=2 to a, floor(3*1/3)=1 to b → weights 4 and 2
    expect(weights!.map((w) => ({ id: w.captainId, weight: w.weight, credited: w.creditedTickets }))).toEqual([
      { id: 'a', weight: 4, credited: 2 },
      { id: 'b', weight: 2, credited: 1 },
      { id: 'c', weight: 0, credited: 0 },
    ])
  })

  it('returns null when nobody has credited tickets so the caller can split equally', () => {
    expect(buildCaptainTicketWeights(captains, [{ captain_id: null, tickets: 5 }])).toBeNull()
    expect(buildCaptainTicketWeights(captains, [{ captain_id: 'other-zone', tickets: 2 }])).toBeNull()
    expect(buildCaptainTicketWeights(captains, [])).toBeNull()
  })

  it('ignores captain ids that are not in the active captain list', () => {
    const weights = buildCaptainTicketWeights(captains, [
      { captain_id: 'a', tickets: 1 },
      { captain_id: 'gone', tickets: 4 },
    ])
    // 4 unallocated redistributed to a only
    expect(weights!.find((w) => w.captainId === 'a')?.weight).toBe(5)
  })
})

describe('splitZonePayoutAmount', () => {
  it('falls back to equal when attribution is null or empty of credited tickets', () => {
    const captains = [captain('a', true), captain('b')]
    expect(splitZonePayoutAmount(100, captains, null).map((s) => s.amount)).toEqual([50, 50])
    expect(splitZonePayoutAmount(100, captains, [{ captain_id: null, tickets: 3 }]).map((s) => s.amount)).toEqual([
      50, 50,
    ])
  })

  it('uses ticket weights when captains have credited tickets', () => {
    const captains = [captain('a', true), captain('b')]
    const shares = splitZonePayoutAmount(300, captains, [
      { captain_id: 'a', tickets: 2 },
      { captain_id: 'b', tickets: 1 },
    ])
    expect(shares.map((s) => ({ id: s.captainId, amount: s.amount }))).toEqual([
      { id: 'a', amount: 200 },
      { id: 'b', amount: 100 },
    ])
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

describe('loadZoneTicketAttribution', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries used referral tickets grouped by the buyer’s chosen captain in the zone', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        { captain_id: 'a', tickets: 2 },
        { captain_id: null, tickets: 1 },
      ],
    } as any)
    const rows = await loadZoneTicketAttribution('event-1', 'zone-1')
    const [sql, params] = vi.mocked(query).mock.calls[0]
    expect(String(sql)).toContain('referral_region_id')
    expect(String(sql)).toContain('u.captain_id')
    expect(String(sql)).toContain("zc.status = 'active'")
    expect(params).toEqual(['event-1', 'zone-1'])
    expect(rows).toEqual([
      { captain_id: 'a', tickets: 2 },
      { captain_id: null, tickets: 1 },
    ])
  })
})
