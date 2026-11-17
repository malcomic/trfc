import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn() }))
vi.mock('../../utils/programCatalog.js', () => ({
  findProgram: vi.fn(),
  getPublishedContent: vi.fn(),
}))

import { query } from '../../config/db.js'
import { findProgram } from '../../utils/programCatalog.js'
import { assertAssigned, assertParticipantInProgram, CoachAccessError } from '../../utils/coachAccess.js'

const COACH_ID = '11111111-1111-4111-8111-111111111111'
const USER_ID = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('assertAssigned', () => {
  it('throws 404 when the program does not exist', async () => {
    vi.mocked(findProgram).mockResolvedValue(null)
    await expect(assertAssigned(COACH_ID, 'missing')).rejects.toMatchObject({ status: 404 })
  })

  it('throws 403 when the coach is not assigned', async () => {
    vi.mocked(findProgram).mockResolvedValue({
      id: 'foundations',
      slug: 'couch-to-5k',
      name: 'Couch to 5K',
      status: 'published',
      is_core: true,
      sort_order: 1,
    } as any)
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
    await expect(assertAssigned(COACH_ID, 'couch-to-5k')).rejects.toBeInstanceOf(CoachAccessError)
    await expect(assertAssigned(COACH_ID, 'couch-to-5k')).rejects.toMatchObject({ status: 403 })
  })

  it('returns the program when assigned', async () => {
    const program = {
      id: 'foundations',
      slug: 'couch-to-5k',
      name: 'Couch to 5K',
      status: 'published',
      is_core: true,
      sort_order: 1,
    }
    vi.mocked(findProgram).mockResolvedValue(program as any)
    vi.mocked(query).mockResolvedValue({ rows: [{ '?column?': 1 }] } as any)
    await expect(assertAssigned(COACH_ID, 'foundations')).resolves.toEqual(program)
  })
})

describe('assertParticipantInProgram', () => {
  it('throws 404 when the participant is not enrolled', async () => {
    vi.mocked(findProgram).mockResolvedValue({
      id: 'foundations',
      slug: 'couch-to-5k',
      name: 'Couch to 5K',
      status: 'published',
      is_core: true,
      sort_order: 1,
    } as any)
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('coach_program_assignments')) return { rows: [{ '?column?': 1 }] }
      return { rows: [] }
    }) as any)
    await expect(assertParticipantInProgram(COACH_ID, USER_ID, 'foundations')).rejects.toMatchObject({
      status: 404,
    })
  })
})
