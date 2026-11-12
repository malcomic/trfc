import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../utils/consents.js', async () => (await import('./helpers/consentMock.js')).consentModuleMock())
vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))

import { query } from '../../config/db.js'
import { updateUserRole } from '../../controllers/usersController.js'

const USER_ID = '0e95ff55-f0e2-4586-9160-691f7d2dc083'

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const makeReq = (role: string) => ({ params: { id: USER_ID }, body: { role } }) as any

const updateCall = () => vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('UPDATE users'))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('UPDATE users')) return { rows: [{ id: USER_ID }] }
    if (sql.includes('SELECT role FROM users')) return { rows: [{ role: 'member' }] }
    return { rows: [] }
  }) as any)
})

describe('updateUserRole', () => {
  it('uses each SQL parameter once so Postgres cannot deduce conflicting types', async () => {
    await updateUserRole(makeReq('admin'), makeRes())
    const sql = String(updateCall()![0])
    for (const param of ['$1', '$2', '$3']) {
      expect(sql.split(param).length - 1).toBe(1)
    }
  })

  it.each([
    ['admin', true],
    ['scanner', true],
    ['member', false],
  ])('sets role %s with dropGoogle=%s', async (role, dropGoogle) => {
    const res = makeRes()
    await updateUserRole(makeReq(role), res)
    expect(updateCall()![1]).toEqual([role, USER_ID, dropGoogle])
    expect(res.json).toHaveBeenCalledWith({ id: USER_ID })
  })
})
