import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { query } from '../../config/db.js'
import { admitMemberCheckin, codeFromInput, lookupMemberCheckin } from '../../utils/memberCheckins.js'

const EVENT_ID = '11111111-1111-4111-8111-111111111111'
const MEMBER_ID = '22222222-2222-4222-8222-222222222222'
const CAPTAIN = { id: '33333333-3333-4333-8333-333333333333', role: 'captain' }
const ADMIN = { id: '44444444-4444-4444-8444-444444444444', role: 'admin' }
const SCANNER = { id: '55555555-5555-4555-8555-555555555555', role: 'scanner' }
const CODE = 'ABCDEFGHJK'
const MEMBER = { id: MEMBER_ID, name: 'Jane Wanjiku', zone: 'Westlands' }

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
    event = { id: EVENT_ID, title: 'Saturday Community Run', cancelled_at: null },
    member = MEMBER,
    captainInZone = true,
    inserted = true,
    existingAt = null,
    ticketUpdated = false,
  } = options
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('FROM events WHERE id = $1')) return { rows: event ? [event] : [] }
    if (sql.includes('WHERE u.member_code = $1')) return { rows: member ? [member] : [] }
    if (sql.includes('JOIN event_zones ez')) return { rows: captainInZone ? [{ '?column?': 1 }] : [] }
    if (sql.includes('INSERT INTO event_checkins')) {
      return { rows: inserted ? [{ scanned_at: '2026-11-07T06:45:00.000Z' }] : [] }
    }
    if (sql.includes('SELECT scanned_at FROM event_checkins')) return { rows: existingAt ? [{ scanned_at: existingAt }] : [] }
    if (sql.includes('UPDATE tickets SET checked_in_at')) {
      return { rows: ticketUpdated ? [{ id: 'ticket-1' }] : [], rowCount: ticketUpdated ? 1 : 0 }
    }
    return { rows: [] }
  }) as any)
}

const calls = (fragment: string) => vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes(fragment))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('codeFromInput', () => {
  it('reads a scanned member pass as a QR scan', () => {
    expect(codeFromInput({ payload: 'member:abcdefghjk' })).toEqual({ code: CODE, method: 'qr' })
  })

  it('reads a typed code', () => {
    expect(codeFromInput({ code: 'abcde-fghjk' })).toEqual({ code: CODE, method: 'code' })
    expect(codeFromInput({ payload: 'ABCDE-FGHJK' })).toEqual({ code: CODE, method: 'code' })
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
      const result = await admitMemberCheckin(actor, EVENT_ID, CODE, 'qr')
      expect(result.status).toBe('valid')
      expect(calls('JOIN event_zones ez')).toHaveLength(0)
      expect(calls('INSERT INTO event_checkins')[0][1]).toEqual([EVENT_ID, MEMBER_ID, actor.id, 'qr'])
    }
  })

  it('lets a captain check in at an event in their zone', async () => {
    setup()
    const result = await admitMemberCheckin(CAPTAIN, EVENT_ID, CODE, 'code')
    expect(result).toMatchObject({ status: 'valid', member: MEMBER, checkedInAt: '2026-11-07T06:45:00.000Z' })
    expect(calls('INSERT INTO event_checkins')[0][1]).toEqual([EVENT_ID, MEMBER_ID, CAPTAIN.id, 'code'])
  })

  it('blocks a captain outside their zone', async () => {
    setup({ captainInZone: false })
    const result = await admitMemberCheckin(CAPTAIN, EVENT_ID, CODE, 'qr')
    expect(result.status).toBe('wrong_zone')
    expect(calls('INSERT INTO event_checkins')).toHaveLength(0)
  })

  it('does nothing on a second scan', async () => {
    setup({ inserted: false, existingAt: '2026-11-07T06:40:00.000Z' })
    const result = await admitMemberCheckin(CAPTAIN, EVENT_ID, CODE, 'qr')
    expect(result).toMatchObject({ status: 'already_checked_in', checkedInAt: '2026-11-07T06:40:00.000Z' })
    expect(String(calls('INSERT INTO event_checkins')[0][0])).toContain('ON CONFLICT (event_id, user_id) DO NOTHING')
  })

  it('also checks in the member’s paid ticket for the event', async () => {
    setup({ ticketUpdated: true })
    const result = await admitMemberCheckin(CAPTAIN, EVENT_ID, CODE, 'qr')
    expect(result.ticketCheckedIn).toBe(true)
    const [sql, params] = calls('UPDATE tickets SET checked_in_at')[0]
    expect(String(sql)).toContain("payment_status = 'paid'")
    expect(String(sql)).toContain('checked_in_at IS NULL')
    expect(params).toEqual([EVENT_ID, MEMBER_ID, CAPTAIN.id])
  })

  it('reports an unknown code', async () => {
    setup({ member: null })
    const result = await admitMemberCheckin(ADMIN, EVENT_ID, CODE, 'qr')
    expect(result).toEqual({ status: 'not_found', member: null, checkedInAt: null })
    expect(calls('INSERT INTO event_checkins')).toHaveLength(0)
  })

  it('refuses cancelled or missing events', async () => {
    setup({ event: { id: EVENT_ID, title: 'Run', cancelled_at: '2026-11-06T10:00:00Z' } })
    await expect(admitMemberCheckin(ADMIN, EVENT_ID, CODE, 'qr')).rejects.toThrow('This event was cancelled')
    setup({ event: null })
    await expect(admitMemberCheckin(ADMIN, EVENT_ID, CODE, 'qr')).rejects.toMatchObject({ status: 404 })
  })
})

describe('lookupMemberCheckin', () => {
  it('shows a member who was already scanned', async () => {
    setup({ existingAt: '2026-11-07T06:40:00.000Z' })
    const result = await lookupMemberCheckin(CAPTAIN, EVENT_ID, CODE)
    expect(result).toEqual({ status: 'already_checked_in', member: MEMBER, checkedInAt: '2026-11-07T06:40:00.000Z' })
    expect(calls('INSERT INTO event_checkins')).toHaveLength(0)
  })

  it('shows a member who can be checked in', async () => {
    setup()
    expect((await lookupMemberCheckin(CAPTAIN, EVENT_ID, CODE)).status).toBe('valid')
  })
})
