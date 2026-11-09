import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))

import { query } from '../../config/db.js'
import {
  exportApplications,
  getHiringSettings,
  listApplications,
  updateApplication,
  updateHiringSettings,
} from '../../controllers/adminHiringController.js'

const ADMIN_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ADMIN = '33333333-3333-4333-8333-333333333333'
const MEMBER_ID = '44444444-4444-4444-8444-444444444444'
const APP_ID = '22222222-2222-4222-8222-222222222222'

const APP_ROW = {
  id: APP_ID,
  full_name: 'Jane Wanjiru',
  phone: '254712345678',
  email: 'jane@example.com',
  location: 'Roysambu',
  social_url: 'https://instagram.com/jane',
  experience: 'Two years',
  can_give_3_hours: true,
  hours: ['morning'],
  worked_harder: '=HYPERLINK("x")',
  video_url: 'https://youtu.be/abcdefghijk',
  video_source: 'link',
  status: 'new',
  handled_by: null,
  handled_by_name: null,
  notes: null,
  created_at: '2026-11-09T07:00:00Z',
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn(), setHeader: vi.fn() }) as any
const calls = (match: string) => vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes(match))

function mockDb() {
  vi.mocked(query).mockImplementation((async (sql: string, params?: unknown[]) => {
    if (sql.includes("WHERE id = $1 AND role = 'admin'")) {
      return { rows: [ADMIN_ID, OTHER_ADMIN].includes(String(params?.[0])) ? [{ '?column?': 1 }] : [] }
    }
    if (sql.startsWith('SELECT status, handled_by FROM coach_applications')) return { rows: [{ status: 'new', handled_by: null }] }
    if (sql.includes('COUNT(*)::int AS total')) return { rows: [{ total: 1 }] }
    if (sql.includes('GROUP BY a.status')) return { rows: [{ status: 'new', count: 3 }, { status: 'accepted', count: 1 }] }
    if (sql.includes('FROM coach_applications a LEFT JOIN users h')) return { rows: [APP_ROW] }
    if (sql.includes('FROM hiring_settings')) return { rows: [{ notify_user_id: OTHER_ADMIN, updated_at: null }] }
    if (sql.includes("FROM users WHERE role = 'admin'")) {
      return { rows: [{ id: ADMIN_ID, name: 'Amy', email: 'amy@trfc.co.ke' }, { id: OTHER_ADMIN, name: 'Ben', email: 'ben@trfc.co.ke' }] }
    }
    return { rows: [] }
  }) as any)
}

describe('admin hiring controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb()
  })

  it('lists applications with counts for every status', async () => {
    const res = makeRes()
    await listApplications({ query: { status: 'new', q: 'jane' } } as any, res)
    const body = res.json.mock.calls[0][0]
    expect(body.total).toBe(1)
    expect(body.counts).toEqual({ all: 4, new: 3, reviewing: 0, call_booked: 0, accepted: 1, not_now: 0 })
    const countsSql = String(calls('GROUP BY a.status')[0][0])
    expect(countsSql).not.toContain('a.status =')
  })

  it('sets the handler and status time when the status changes', async () => {
    const res = makeRes()
    await updateApplication({ params: { id: APP_ID }, body: { status: 'reviewing' }, user: { id: ADMIN_ID } } as any, res)
    const [sql, params] = calls('UPDATE coach_applications SET')[0]
    expect(sql).toContain('status_changed_at = NOW()')
    expect(sql).toContain('handled_by = $2')
    expect(params).toEqual(['reviewing', ADMIN_ID, APP_ID])
  })

  it('keeps a chosen handler and saves notes', async () => {
    const res = makeRes()
    await updateApplication(
      { params: { id: APP_ID }, body: { status: 'call_booked', handledBy: OTHER_ADMIN, notes: '  Call Friday  ' }, user: { id: ADMIN_ID } } as any,
      res
    )
    const [, params] = calls('UPDATE coach_applications SET')[0]
    expect(params).toEqual(['call_booked', 'Call Friday', OTHER_ADMIN, APP_ID])
  })

  it('refuses a handler who is not an admin and an unknown status', async () => {
    const res = makeRes()
    await updateApplication({ params: { id: APP_ID }, body: { handledBy: MEMBER_ID }, user: { id: ADMIN_ID } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)

    const res2 = makeRes()
    await updateApplication({ params: { id: APP_ID }, body: { status: 'hired' }, user: { id: ADMIN_ID } } as any, res2)
    expect(res2.status).toHaveBeenCalledWith(400)
    expect(calls('UPDATE coach_applications SET')).toHaveLength(0)
  })

  it('returns 404 for a bad id', async () => {
    const res = makeRes()
    await updateApplication({ params: { id: 'nope' }, body: {}, user: { id: ADMIN_ID } } as any, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('only lets an admin be chosen for new application emails', async () => {
    const res = makeRes()
    await updateHiringSettings({ body: { notifyUserId: MEMBER_ID }, user: { id: ADMIN_ID } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(calls('INSERT INTO hiring_settings')).toHaveLength(0)

    const ok = makeRes()
    await updateHiringSettings({ body: { notifyUserId: OTHER_ADMIN }, user: { id: ADMIN_ID } } as any, ok)
    expect(calls('INSERT INTO hiring_settings')[0][1]).toEqual([OTHER_ADMIN, ADMIN_ID])

    const clear = makeRes()
    await updateHiringSettings({ body: { notifyUserId: null }, user: { id: ADMIN_ID } } as any, clear)
    expect(calls('INSERT INTO hiring_settings')[1][1]).toEqual([null, ADMIN_ID])
  })

  it('returns the chosen admin and the admin list', async () => {
    const res = makeRes()
    await getHiringSettings({} as any, res)
    const body = res.json.mock.calls[0][0]
    expect(body.notifyUserId).toBe(OTHER_ADMIN)
    expect(body.admins).toHaveLength(2)
  })

  it('exports a CSV with headers and safe cells', async () => {
    const res = makeRes()
    await exportApplications({ query: {} } as any, res)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8')
    const csv = String(res.send.mock.calls[0][0])
    expect(csv).toContain('"Full name"')
    expect(csv).toContain('"Can give 3 hours a day"')
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
    expect(csv).toContain('"New"')
  })
})
