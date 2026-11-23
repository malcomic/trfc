import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

vi.mock('../../utils/pointsSettings.js', () => ({
  getPointsSettings: vi.fn(async () => ({
    scanGraceHours: 24,
    zoneRunPoints: 10,
    commonRunPoints: 15,
    hikeFitfestPoints: 30,
    marathonPoints: 30,
    streakBonusPoints: 10,
    streakLength: 4,
  })),
  pointsForKind: vi.fn(() => 10),
}))

vi.mock('../../utils/pointsEligibility.js', () => ({
  getCurrentSeason: vi.fn(async () => ({ id: 'season-1' })),
  isCaptainUser: vi.fn(async () => false),
  isPaidActiveOn: vi.fn(async () => true),
  isSeasonFrozen: vi.fn(async () => false),
}))

vi.mock('../../utils/pointsLedger.js', () => ({
  appendSeasonPoints: vi.fn(async () => ({ id: 'ledger-1' })),
}))

vi.mock('../../utils/pointsStreak.js', () => ({
  maybeAwardStreakBonus: vi.fn(async () => 0),
}))

import { query, getClient } from '../../config/db.js'
import { admitMemberCheckin, codeFromInput, lookupMemberCheckin } from '../../utils/memberCheckins.js'
import { isPaidActiveOn } from '../../utils/pointsEligibility.js'

const EVENT_ID = '11111111-1111-4111-8111-111111111111'
const MEMBER_ID = '22222222-2222-4222-8222-222222222222'
const CAPTAIN = { id: '33333333-3333-4333-8333-333333333333', role: 'captain' as const }
const ADMIN = { id: '44444444-4444-4444-8444-444444444444', role: 'admin' as const }
const SCANNER = { id: '55555555-5555-4555-8555-555555555555', role: 'scanner' as const }
const CODE = 'ABCDEFGHJK'
const MEMBER = { id: MEMBER_ID, name: 'Jane Wanjiku', zone: 'Westlands', paidMember: true }
const INPUT = { kind: 'code' as const, code: CODE, method: 'qr' as const }
const CODE_INPUT = { kind: 'code' as const, code: CODE, method: 'code' as const }

interface Setup {
  event?: Record<string, unknown> | null
  member?: typeof MEMBER | null
  captainInZone?: boolean
  inserted?: boolean
  existingAt?: string | null
  ticketUpdated?: boolean
}

function setup(options: Setup = {}) {
  const {
    event = {
      id: EVENT_ID,
      title: 'Saturday Community Run',
      cancelled_at: null,
      event_date: new Date(),
      ends_at: null,
      season_id: 'season-1',
      points_kind: 'zone_run',
      is_community_run: true,
    },
    member = MEMBER,
    captainInZone = true,
    inserted = true,
    existingAt = null,
    ticketUpdated = false,
  } = options

  const impl = async (sql: string) => {
    if (sql.includes('FROM events WHERE id = $1')) return { rows: event ? [event] : [] }
    if (sql.includes('WHERE u.member_code = $1')) return { rows: member ? [member] : [] }
    if (sql.includes('JOIN event_zones ez')) return { rows: captainInZone ? [{ '?column?': 1 }] : [] }
    if (sql.includes('INSERT INTO event_checkins')) {
      return {
        rows: inserted ? [{ id: 'checkin-1', scanned_at: '2026-11-07T06:45:00.000Z' }] : [],
      }
    }
    if (sql.includes('SELECT scanned_at FROM event_checkins')) {
      return { rows: existingAt ? [{ scanned_at: existingAt }] : [] }
    }
    if (sql.includes('UPDATE tickets SET checked_in_at')) {
      return { rows: ticketUpdated ? [{ id: 'ticket-1' }] : [], rowCount: ticketUpdated ? 1 : 0 }
    }
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] }
    return { rows: [] }
  }

  vi.mocked(query).mockImplementation(impl as any)
  vi.mocked(getClient).mockResolvedValue({
    query: impl,
    release: vi.fn(),
  } as any)
}

const calls = (fragment: string) =>
  [
    ...vi.mocked(query).mock.calls,
    ...((vi.mocked(getClient).mock.results[0]?.value as any)?.query
      ? []
      : []),
  ].filter(([sql]) => String(sql).includes(fragment))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isPaidActiveOn).mockResolvedValue(true)
})

describe('codeFromInput', () => {
  it('reads a scanned member pass as a QR scan', () => {
    expect(codeFromInput({ payload: 'member:abcdefghjk' })).toEqual({
      kind: 'code',
      code: CODE,
      method: 'qr',
    })
  })

  it('reads a typed code', () => {
    expect(codeFromInput({ code: 'abcde-fghjk' })).toEqual({ kind: 'code', code: CODE, method: 'code' })
  })

  it('reads a rotating memberpass payload', () => {
    const userId = MEMBER_ID
    expect(codeFromInput({ payload: `memberpass:${userId}:abcdef123456` })).toEqual({
      kind: 'pass',
      userId,
      token: 'abcdef123456',
      method: 'qr',
    })
  })

  it('rejects tickets and junk', () => {
    expect(codeFromInput({ payload: `${EVENT_ID}:${EVENT_ID}` })).toBeNull()
    expect(codeFromInput({ code: '123' })).toBeNull()
    expect(codeFromInput({})).toBeNull()
  })
})

describe('admitMemberCheckin', () => {
  it('lets admins and scanners check in at any event without a zone check', async () => {
    for (const actor of [ADMIN, SCANNER]) {
      vi.clearAllMocks()
      setup({ captainInZone: false })
      const result = await admitMemberCheckin(actor, EVENT_ID, INPUT)
      expect(result.status).toBe('valid')
    }
  })

  it('lets a captain check in at an event in their zone', async () => {
    setup()
    const result = await admitMemberCheckin(CAPTAIN, EVENT_ID, CODE_INPUT)
    expect(result).toMatchObject({ status: 'valid', member: MEMBER, checkedInAt: '2026-11-07T06:45:00.000Z' })
  })

  it('blocks a captain outside their zone', async () => {
    setup({ captainInZone: false })
    const result = await admitMemberCheckin(CAPTAIN, EVENT_ID, INPUT)
    expect(result.status).toBe('wrong_zone')
  })

  it('blocks self-scan', async () => {
    setup()
    const result = await admitMemberCheckin({ id: MEMBER_ID, role: 'captain' }, EVENT_ID, INPUT)
    expect(result.status).toBe('self_scan')
  })

  it('blocks unpaid members', async () => {
    setup()
    vi.mocked(isPaidActiveOn).mockResolvedValueOnce(false)
    const result = await admitMemberCheckin(CAPTAIN, EVENT_ID, INPUT)
    expect(result.status).toBe('not_eligible')
  })

  it('does nothing on a second scan', async () => {
    setup({ inserted: false, existingAt: '2026-11-07T06:40:00.000Z' })
    const result = await admitMemberCheckin(CAPTAIN, EVENT_ID, INPUT)
    expect(result).toMatchObject({ status: 'already_checked_in', checkedInAt: '2026-11-07T06:40:00.000Z' })
  })

  it('also checks in the member’s paid ticket for the event', async () => {
    setup({ ticketUpdated: true })
    const result = await admitMemberCheckin(CAPTAIN, EVENT_ID, INPUT)
    expect(result.ticketCheckedIn).toBe(true)
  })

  it('reports an unknown code', async () => {
    setup({ member: null })
    const result = await admitMemberCheckin(ADMIN, EVENT_ID, INPUT)
    expect(result).toEqual({ status: 'not_found', member: null, checkedInAt: null })
  })

  it('refuses cancelled or missing events', async () => {
    setup({
      event: {
        id: EVENT_ID,
        title: 'Run',
        cancelled_at: '2026-11-06T10:00:00Z',
        event_date: new Date(),
        ends_at: null,
        season_id: 'season-1',
        points_kind: 'none',
        is_community_run: false,
      },
    })
    await expect(admitMemberCheckin(ADMIN, EVENT_ID, INPUT)).rejects.toThrow('This event was cancelled')
    setup({ event: null })
    await expect(admitMemberCheckin(ADMIN, EVENT_ID, INPUT)).rejects.toMatchObject({ status: 404 })
  })
})

describe('lookupMemberCheckin', () => {
  it('shows a member who was already scanned', async () => {
    setup({ existingAt: '2026-11-07T06:40:00.000Z' })
    const result = await lookupMemberCheckin(CAPTAIN, EVENT_ID, INPUT)
    expect(result).toEqual({ status: 'already_checked_in', member: MEMBER, checkedInAt: '2026-11-07T06:40:00.000Z' })
  })

  it('shows a member who can be checked in', async () => {
    setup()
    expect((await lookupMemberCheckin(CAPTAIN, EVENT_ID, INPUT)).status).toBe('valid')
  })
})
