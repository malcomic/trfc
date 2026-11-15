import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))
vi.mock('../../utils/policies.js', () => ({
  getNumberSetting: vi.fn(async () => 30),
  latestMaterialChangeAt: vi.fn(async () => null),
  needsConsent: vi.fn(() => false),
}))
vi.mock('../../utils/cloudinary.js', () => ({
  deletePublicRaw: vi.fn(),
  deleteVideo: vi.fn(),
}))

import { query } from '../../config/db.js'
import { FREE_PROGRAM_ID } from '../../config/onboarding.js'
import {
  MISSING_AFTER_SATURDAYS,
  NEW_MEMBER_DAYS,
  OPEN_LOG_THROTTLE_MINUTES,
  ZONE_ACTIVITY_CTES,
  isMemberStatus,
  loadZoneTeam,
  loadZoneTeamExport,
  logCaptainAccess,
} from '../../utils/captainZone.js'
import {
  exportMyTeam,
  getCaptainAccessLog,
  getMyCaptainProfile,
  getMyTeam,
  recordLinkVisit,
} from '../../controllers/captainsController.js'
import { listScannedMembers } from '../../utils/memberCheckins.js'
import { adminMiddleware } from '../../middleware/auth.js'
import { runRetention } from '../../utils/retention.js'

const CAPTAIN_ID = '33333333-3333-4333-8333-333333333333'
const ZONE_ID = '11111111-1111-4111-8111-111111111111'
const EVENT_ID = '22222222-2222-4222-8222-222222222222'
const MEMBER_ID = '44444444-4444-4444-8444-444444444444'

type Handler = (sql: string, params: any[]) => { rows: any[]; rowCount?: number } | undefined

function routeQueries(handler: Handler) {
  vi.mocked(query).mockImplementation((async (sql: string, params: any[] = []) => {
    return handler(sql, params) ?? { rows: [], rowCount: 0 }
  }) as any)
}

const makeRes = () => {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  }
  return res
}

const sqlCalls = () => vi.mocked(query).mock.calls.map(([sql]) => String(sql))
const callMatching = (fragment: string) =>
  vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes(fragment))

beforeEach(() => vi.clearAllMocks())

describe('ZONE_ACTIVITY_CTES status rules', () => {
  it(`marks members new for ${NEW_MEMBER_DAYS} days, and new wins over missing`, () => {
    expect(ZONE_ACTIVITY_CTES).toContain(`make_interval(days => ${NEW_MEMBER_DAYS})`)
    expect(ZONE_ACTIVITY_CTES).toMatch(/WHEN ma\.signed_up_at >= NOW\(\) - make_interval\(days => 14\) THEN 'new'/)
    expect(ZONE_ACTIVITY_CTES).toMatch(
      new RegExp(`WHEN ma\\.missed_saturdays >= ${MISSING_AFTER_SATURDAYS} THEN 'missing'`)
    )
    const caseBlock = ZONE_ACTIVITY_CTES.slice(ZONE_ACTIVITY_CTES.indexOf('CASE'))
    expect(caseBlock.indexOf("'new'")).toBeLessThan(caseBlock.indexOf("'missing'"))
  })

  it('counts missed Saturdays from the later of last_seen and sign-up, and ignores cancelled events', () => {
    expect(ZONE_ACTIVITY_CTES).toContain('GREATEST(att.last_seen, zm.signed_up_at::date)')
    expect(ZONE_ACTIVITY_CTES).toContain('e.cancelled_at IS NULL')
    expect(ZONE_ACTIVITY_CTES).toContain('EXTRACT(DOW FROM e.event_date) = 6')
  })

  it('accepts only new, active and missing as member statuses', () => {
    expect(isMemberStatus('new')).toBe(true)
    expect(isMemberStatus('active')).toBe(true)
    expect(isMemberStatus('missing')).toBe(true)
    expect(isMemberStatus('inactive')).toBe(false)
    expect(isMemberStatus(null)).toBe(false)
  })
})

describe('loadZoneTeam', () => {
  it('asks only for Couch to 5K and never selects a phone without a share', async () => {
    routeQueries(() => ({ rows: [] }))
    await loadZoneTeam(CAPTAIN_ID)
    const [sql, params] = callMatching('FROM member_status m')!
    expect(params).toEqual([CAPTAIN_ID, FREE_PROGRAM_ID])
    expect(FREE_PROGRAM_ID).toBe('foundations')
    expect(String(sql)).toContain('pe.program = $2')
    expect(String(sql)).toContain('CASE WHEN s.enabled THEN COALESCE(u.whatsapp, u.phone_normalized) END')
    expect(String(sql)).not.toMatch(/u\.phone(?!_normalized)/)
  })

  it('applies name search and status filters', async () => {
    routeQueries(() => ({ rows: [{ id: MEMBER_ID, name: 'Jane', status: 'missing' }] }))
    const rows = await loadZoneTeam(CAPTAIN_ID, { q: 'Jane_50%', status: 'missing' })
    const [sql, params] = callMatching('FROM member_status m')!
    expect(params).toEqual([CAPTAIN_ID, FREE_PROGRAM_ID, '%Jane\\_50\\%%', 'missing'])
    expect(String(sql)).toContain('m.name ILIKE')
    expect(String(sql)).toContain('m.status =')
    expect(rows).toHaveLength(1)
  })
})

describe('export and access logging', () => {
  it('export rows have no phone fields and are logged with the action and row count', async () => {
    const rows = [
      { name: 'Jane', status: 'active', missed_saturdays: 0, saturdays_attended: 2, last_seen: '2026-11-08', signed_up_at: '2026-10-01' },
    ]
    routeQueries((sql) => {
      if (sql.includes('FROM member_status m') && !sql.includes('programs')) return { rows }
      return undefined
    })
    const res = makeRes()
    await exportMyTeam({ user: { id: CAPTAIN_ID }, query: { action: 'export' } } as any, res)

    const [exportSql] = callMatching('FROM member_status m')!
    expect(String(exportSql)).not.toMatch(/phone|whatsapp/i)
    expect(Object.keys(rows[0])).not.toContain('phone')
    expect(Object.keys(rows[0])).not.toContain('whatsapp')

    const logCall = callMatching('INSERT INTO captain_access_log')
    expect(logCall?.[1]).toEqual([CAPTAIN_ID, 'export', 1])
    expect(res.json).toHaveBeenCalledWith(rows)
  })

  it('copy uses action copy in the access log', async () => {
    routeQueries((sql) => (sql.includes('FROM member_status m') ? { rows: [] } : undefined))
    const res = makeRes()
    await exportMyTeam({ user: { id: CAPTAIN_ID }, query: { action: 'copy' } } as any, res)
    expect(callMatching('INSERT INTO captain_access_log')?.[1]).toEqual([CAPTAIN_ID, 'copy', 0])
  })

  it(`throttles dashboard opens to once every ${OPEN_LOG_THROTTLE_MINUTES} minutes`, async () => {
    routeQueries(() => ({ rows: [] }))
    await logCaptainAccess(CAPTAIN_ID, 'open')
    const [sql, params] = callMatching('INSERT INTO captain_access_log')!
    expect(String(sql)).toContain("action = 'open'")
    expect(String(sql)).toContain('WHERE NOT EXISTS')
    expect(params).toEqual([CAPTAIN_ID, OPEN_LOG_THROTTLE_MINUTES])
  })

  it('logs an open when the captain opens their dashboard', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM captains c') && sql.includes('JOIN users u') && sql.includes('JOIN regions r')) {
        return {
          rows: [
            {
              user_id: CAPTAIN_ID,
              payout_phone: null,
              photo_url: null,
              status: 'active',
              created_at: '2026-01-01',
              name: 'Irene',
              email: null,
              phone: '0712',
              region_id: ZONE_ID,
              region_name: 'Thika',
              region_code: 'THK',
            },
          ],
        }
      }
      if (sql.includes('lead_captain_name')) {
        return {
          rows: [
            {
              id: ZONE_ID,
              name: 'Thika',
              code: 'THK',
              referral_code: 'THK',
              commission_rate: 0.05,
              lead_captain_id: CAPTAIN_ID,
              lead_captain_name: 'Irene',
            },
          ],
        }
      }
      if (sql.includes('referred_customers')) {
        return {
          rows: [
            {
              referred_customers: 0,
              team_members: 0,
              active_captains: 1,
              my_paid_amount: 0,
              referred_sales: 0,
              pending_amount: 0,
              approved_amount: 0,
              paid_amount: 0,
              my_pending_amount: 0,
              my_approved_amount: 0,
              my_commission_paid_amount: 0,
              zone_pending_amount: 0,
              zone_approved_amount: 0,
              zone_paid_amount: 0,
            },
          ],
        }
      }
      return undefined
    })
    const res = makeRes()
    await getMyCaptainProfile({ user: { id: CAPTAIN_ID } } as any, res)
    expect(callMatching("action = 'open'")?.[1]).toEqual([CAPTAIN_ID, OPEN_LOG_THROTTLE_MINUTES])
    expect(res.json).toHaveBeenCalled()
  })
})

describe('getMyTeam endpoint', () => {
  it('passes search and status through and keeps Couch to 5K only', async () => {
    routeQueries(() => ({ rows: [] }))
    const res = makeRes()
    await getMyTeam({ user: { id: CAPTAIN_ID }, query: { q: 'Tom', status: 'new' } } as any, res)
    const [sql, params] = callMatching('FROM member_status m')!
    expect(params).toEqual([CAPTAIN_ID, FREE_PROGRAM_ID, '%Tom%', 'new'])
    expect(String(sql)).toContain('pe.program = $2')
    expect(res.json).toHaveBeenCalledWith([])
  })
})

describe('recordLinkVisit', () => {
  it('records one open per browser per day and ignores unknown codes', async () => {
    const visitorId = 'visitor-abcdef12'
    routeQueries((sql) => {
      if (sql.includes('referral_code') || sql.includes('FROM regions')) {
        return { rows: [{ region_id: ZONE_ID, region_name: 'Thika', region_code: 'THK', referral_code: 'THK', commission_rate: 0.05 }] }
      }
      return undefined
    })
    const res = makeRes()
    await recordLinkVisit({ params: { code: 'THK' }, body: { visitorId } } as any, res)
    const insert = callMatching('INSERT INTO referral_link_visits')
    expect(insert?.[1]?.[0]).toBe(ZONE_ID)
    expect(insert?.[1]?.[1]).toBe(visitorId)
    expect(String(insert?.[0])).toContain('ON CONFLICT DO NOTHING')
    expect(res.status).toHaveBeenCalledWith(204)

    vi.clearAllMocks()
    routeQueries(() => ({ rows: [] }))
    const unknown = makeRes()
    await recordLinkVisit({ params: { code: 'NOPE' }, body: { visitorId } } as any, unknown)
    expect(callMatching('INSERT INTO referral_link_visits')).toBeUndefined()
    expect(unknown.status).toHaveBeenCalledWith(204)
  })

  it('rejects a bad visitor id', async () => {
    const res = makeRes()
    await recordLinkVisit({ params: { code: 'THK' }, body: { visitorId: 'short' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(query).not.toHaveBeenCalled()
  })
})

describe('listScannedMembers zone scope', () => {
  it('rejects a captain outside the event zone', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM events WHERE id = $1')) {
        return { rows: [{ id: EVENT_ID, title: 'Run', cancelled_at: null }] }
      }
      if (sql.includes('JOIN event_zones')) return { rows: [] }
      return undefined
    })
    await expect(listScannedMembers({ id: CAPTAIN_ID, role: 'captain' }, EVENT_ID)).rejects.toMatchObject({
      status: 403,
    })
    expect(callMatching('FROM event_checkins ec')).toBeUndefined()
  })

  it('scopes a captain to their zone members and their own scans', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM events WHERE id = $1')) {
        return { rows: [{ id: EVENT_ID, title: 'Run', cancelled_at: null }] }
      }
      if (sql.includes('JOIN event_zones')) return { rows: [{ '?column?': 1 }] }
      if (sql.includes('FROM event_checkins ec')) {
        return { rows: [{ id: MEMBER_ID, name: 'Jane', scanned_at: '2026-11-08T06:00:00Z', saturdays_attended: 2 }] }
      }
      return undefined
    })
    const rows = await listScannedMembers({ id: CAPTAIN_ID, role: 'captain' }, EVENT_ID)
    const [sql, params] = callMatching('FROM event_checkins ec')!
    expect(String(sql)).toContain('ec.scanned_by = $2')
    expect(String(sql)).toContain('u.captain_id = $2')
    expect(params).toEqual([EVENT_ID, CAPTAIN_ID])
    expect(rows).toHaveLength(1)
  })

  it('lets staff see every scan without a zone filter', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM events WHERE id = $1')) {
        return { rows: [{ id: EVENT_ID, title: 'Run', cancelled_at: null }] }
      }
      if (sql.includes('FROM event_checkins ec')) return { rows: [] }
      return undefined
    })
    await listScannedMembers({ id: 'admin', role: 'admin' }, EVENT_ID)
    expect(callMatching('JOIN event_zones')).toBeUndefined()
    expect(callMatching('FROM event_checkins ec')?.[1]).toEqual([EVENT_ID])
  })
})

describe('admin access log', () => {
  it('returns 403 when a captain hits the admin middleware', () => {
    const res = makeRes()
    const next = vi.fn()
    adminMiddleware({ user: { id: CAPTAIN_ID, role: 'captain' } } as any, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('is registered behind admin middleware', () => {
    const adminRoutes = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), '../../routes/admin.ts'),
      'utf8'
    )
    expect(adminRoutes).toContain("router.get('/captain-access-log', getCaptainAccessLog)")
    expect(adminRoutes).toContain('router.use(authMiddleware, adminMiddleware)')
  })

  it('lists newest first with captain and zone names', async () => {
    const rows = [
      {
        id: 'log-1',
        user_id: CAPTAIN_ID,
        region_id: ZONE_ID,
        action: 'export',
        row_count: 3,
        created_at: '2026-11-08T10:00:00Z',
        captain_name: 'Irene',
        region_name: 'Thika',
        region_code: 'THK',
      },
    ]
    routeQueries(() => ({ rows }))
    const res = makeRes()
    await getCaptainAccessLog(
      { query: { captainId: CAPTAIN_ID, from: '2026-11-01', to: '2026-11-15' } } as any,
      res
    )
    const [sql, params] = callMatching('FROM captain_access_log')!
    expect(String(sql)).toContain('ORDER BY l.created_at DESC')
    expect(String(sql)).toContain('LIMIT 1000')
    expect(String(sql)).toContain('u.name AS captain_name')
    expect(params).toEqual([CAPTAIN_ID, '2026-11-01', '2026-11-15'])
    expect(res.json).toHaveBeenCalledWith(rows)
  })
})

describe('retention', () => {
  it('purges the access log after 12 months and link visits after 24 months', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 } as any)
    await runRetention(new Date('2026-11-08T12:00:00Z'))
    const sql = sqlCalls().join('\n')
    expect(sql).toContain("DELETE FROM captain_access_log WHERE created_at < NOW() - INTERVAL '12 months'")
    expect(sql).toContain("DELETE FROM referral_link_visits WHERE visit_date < CURRENT_DATE - INTERVAL '24 months'")
  })
})

describe('loadZoneTeamExport', () => {
  it('never returns phone or WhatsApp', async () => {
    routeQueries(() => ({
      rows: [{ name: 'Jane', status: 'new', missed_saturdays: 0, saturdays_attended: 0, last_seen: null, signed_up_at: '2026-11-01' }],
    }))
    const rows = await loadZoneTeamExport(CAPTAIN_ID)
    const [sql] = callMatching('FROM member_status m')!
    expect(String(sql)).not.toMatch(/phone|whatsapp/i)
    expect(rows[0]).not.toHaveProperty('phone')
    expect(rows[0]).not.toHaveProperty('whatsapp')
  })
})
