import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPendingTestimonials } from '../../controllers/testimonialsController.js'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))

import { query } from '../../config/db.js'

describe('getPendingTestimonials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unapproved testimonials ordered by created_at desc', async () => {
    const mockRows = [
      { id: '1', member_name: 'Jane', message: 'Great club', rating: 5, is_approved: false },
    ]
    vi.mocked(query).mockResolvedValue({ rows: mockRows } as any)

    const req = {} as any
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any

    await getPendingTestimonials(req, res)

    expect(query).toHaveBeenCalledWith(
      'SELECT * FROM testimonials WHERE is_approved = false ORDER BY created_at DESC'
    )
    expect(res.json).toHaveBeenCalledWith(mockRows)
  })

  it('returns 500 on database error', async () => {
    vi.mocked(query).mockRejectedValue(new Error('db error'))

    const req = {} as any
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any

    await getPendingTestimonials(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch pending testimonials' })
  })
})
