import { describe, it, expect, vi, beforeEach } from 'vitest'

const client = { query: vi.fn(), release: vi.fn() }

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(async () => client),
}))

import { query } from '../../config/db.js'
import { createMemberLog, exportMembers, getMembers } from '../../controllers/reachOutController.js'

const ADMIN_ID = '11111111-1111-4111-8111-111111111111'
const MEMBER_ID = '22222222-2222-4222-8222-222222222222'

const MEMBER_ROW = {
  id: MEMBER_ID,
  name: 'Jane',
  phone: '0712345678',
  whatsapp: '254712345678',
  email: 'jane@example.com',
  created_at: '2026-10-01T08:00:00Z',
  last_active_at: null,
  hardest_now: 'other',
  hardest_now_other: 'Night shifts',
  goal_3m: null,
  time_with_trfc: 'prefer_not_to_say',
  want_more: 'zone_walks',
  exercise_frequency: '1_2',
  zone: 'juja',
  zone_name: 'Juja',
  outreach_status: 'not_contacted',
  events_attended: 2,
  last_contacted_at: null,
  last_contacted_by: null,
  last_note: null,
}

function mockDb() {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('COUNT(*)::int AS total')) return { rows: [{ total: 1 }] }
    if (sql.includes('SELECT u.id, u.name')) return { rows: [MEMBER_ROW] }
    if (sql.includes("role NOT IN ('admin', 'scanner')") && sql.startsWith('SELECT id FROM users')) return { rows: [{ id: MEMBER_ID }] }
    if (sql.startsWith('SELECT name FROM users')) return { rows: [{ name: 'Admin Amy' }] }
    return { rows: [] }
  }) as any)
  client.query.mockImplementation(async (sql: string) => {
    if (sql.includes('INSERT INTO outreach_log')) {
      return { rows: [{ id: 'log-1', status: 'contacted', note: 'Called', created_at: '2026-11-03T07:00:00Z' }] }
    }
    return { rows: [] }
  })
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn(), setHeader: vi.fn() }) as any
const calls = (match: string) => vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes(match))

describe('reach out controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockDb()
  })

  it('lists members without the contact consent field and logs a view on page 1', async () => {
    const res = makeRes()
    await getMembers({ query: { status: 'not_contacted' }, user: { id: ADMIN_ID } } as any, res)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 1, page: 1, members: [MEMBER_ROW] }))
    const listSql = String(calls('SELECT u.id, u.name')[0][0])
    expect(listSql).not.toContain('contact_consent')
    await vi.waitFor(() => expect(calls('INSERT INTO reach_out_access_log')).toHaveLength(1))
    expect(calls('INSERT INTO reach_out_access_log')[0][1]).toEqual([ADMIN_ID, 'view', '{"status":"not_contacted"}', 1])
  })

  it('does not log a view for searches or later pages', async () => {
    await getMembers({ query: { search: 'jan' }, user: { id: ADMIN_ID } } as any, makeRes())
    await getMembers({ query: { page: '2' }, user: { id: ADMIN_ID } } as any, makeRes())
    expect(calls('INSERT INTO reach_out_access_log')).toHaveLength(0)
  })

  it('appends to the history and sets the status, never changing old entries', async () => {
    const res = makeRes()
    await createMemberLog({ params: { id: MEMBER_ID }, body: { status: 'contacted', note: ' Called ' }, user: { id: ADMIN_ID } } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'log-1', contacted_by_name: 'Admin Amy' }))
    const sqls = client.query.mock.calls.map(([sql]) => String(sql))
    expect(sqls).toContain('BEGIN')
    expect(sqls).toContain('COMMIT')
    const insert = client.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO outreach_log'))!
    expect(insert[1]).toEqual([MEMBER_ID, 'contacted', 'Called', ADMIN_ID])
    expect(sqls.some((sql) => /UPDATE outreach_log|DELETE FROM outreach_log/.test(sql))).toBe(false)
    expect(sqls.some((sql) => sql.includes('ON CONFLICT (user_id) DO UPDATE SET outreach_status'))).toBe(true)
  })

  it('rejects an unknown status', async () => {
    const res = makeRes()
    await createMemberLog({ params: { id: MEMBER_ID }, body: { status: 'ghosted' }, user: { id: ADMIN_ID } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(client.query).not.toHaveBeenCalled()
  })

  it('exports a CSV with dashes for blank answers and logs the export', async () => {
    const res = makeRes()
    await exportMembers({ query: { zone: 'outside' }, user: { id: ADMIN_ID } } as any, res)

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8')
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/^attachment; filename="reach-out-\d{4}-\d{2}-\d{2}\.csv"$/))
    const csv = String(res.send.mock.calls[0][0])
    const [header, row] = csv.replace('\uFEFF', '').trim().split('\r\n')
    expect(header).toContain('"Hardest right now (Other)"')
    expect(row).toContain('"Juja"')
    expect(row).toContain('"Night shifts"')
    // goal_3m blank and time_with_trfc "prefer_not_to_say" both become a dash
    expect(row.match(/"-"/g)?.length).toBeGreaterThanOrEqual(2)
    expect(calls('INSERT INTO reach_out_access_log')[0][1]).toEqual([ADMIN_ID, 'export', '{"zone":"outside"}', 1])
  })

  it('does not send the file when the export cannot be logged', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('INSERT INTO reach_out_access_log')) throw new Error('db down')
      if (sql.includes('SELECT u.id, u.name')) return { rows: [MEMBER_ROW] }
      return { rows: [] }
    }) as any)
    const res = makeRes()
    await exportMembers({ query: {}, user: { id: ADMIN_ID } } as any, res)
    expect(res.send).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
