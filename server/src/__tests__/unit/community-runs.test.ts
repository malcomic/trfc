import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))

import { query } from '../../config/db.js'
import { ensureUpcomingCommunityRuns, upcomingSaturdays } from '../../utils/communityRuns.js'

/** `existingDays` are Saturdays that already have a community run (including cancelled ones). */
function setup(existingDays: string[] = []) {
  let nextId = 1
  vi.mocked(query).mockImplementation((async (sql: string, params: any[] = []) => {
    if (sql.includes('FROM ticket_rules_settings')) return { rows: [{ run_time: '07:00', location: 'Karura Forest' }] }
    if (sql.includes('SELECT 1 FROM events')) return { rows: existingDays.includes(params[0]) ? [{ '?column?': 1 }] : [] }
    if (sql.includes('INSERT INTO events')) return { rows: [{ id: `event-${nextId++}` }] }
    return { rows: [] }
  }) as any)
}

const calls = (fragment: string) => vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes(fragment))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('upcomingSaturdays', () => {
  it('starts from the next Saturday in Nairobi', () => {
    // Tuesday 3 Nov 2026, 22:00 in Nairobi
    expect(upcomingSaturdays(new Date('2026-11-03T19:00:00Z'))).toEqual(['2026-11-07', '2026-11-14'])
  })

  it('includes today when it is already Saturday in Nairobi', () => {
    // Friday 23:30 UTC is Saturday 02:30 in Nairobi
    expect(upcomingSaturdays(new Date('2026-11-06T23:30:00Z'))).toEqual(['2026-11-07', '2026-11-14'])
  })
})

describe('ensureUpcomingCommunityRuns', () => {
  const now = new Date('2026-11-03T19:00:00Z')

  it('creates missing Saturday runs linked to every active zone', async () => {
    setup()
    expect(await ensureUpcomingCommunityRuns(now)).toBe(2)
    const inserts = calls('INSERT INTO events')
    expect(inserts).toHaveLength(2)
    expect(inserts[0][1]).toEqual(['Saturday Community Run', expect.any(String), 'Karura Forest', '2026-11-07', '07:00'])
    expect(String(inserts[0][0])).toContain('is_community_run')
    const zones = calls('INSERT INTO event_zones')
    expect(zones).toHaveLength(2)
    expect(String(zones[0][0])).toContain('r.is_active = true')
    expect(zones[0][1]).toEqual(['event-1'])
  })

  it('never creates a second run for the same Saturday', async () => {
    setup(['2026-11-07'])
    expect(await ensureUpcomingCommunityRuns(now)).toBe(1)
    expect(calls('INSERT INTO events')[0][1]).toContain('2026-11-14')
  })

  it('does not re-create a run that was cancelled', async () => {
    setup(['2026-11-07', '2026-11-14'])
    expect(await ensureUpcomingCommunityRuns(now)).toBe(0)
    expect(calls('INSERT INTO events')).toHaveLength(0)
    // The existence check ignores cancelled_at, so cancelled runs still count as existing.
    expect(String(calls('SELECT 1 FROM events')[0][0])).not.toContain('cancelled_at')
  })
})
