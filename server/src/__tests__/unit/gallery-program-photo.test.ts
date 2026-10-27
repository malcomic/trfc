import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

vi.mock('../../utils/cloudinary.js', () => ({
  uploadToCloudinary: vi.fn(),
}))

import { query } from '../../config/db.js'
import {
  normalizeProgramPhoto,
  getProgramPhotos,
  updateMedia,
} from '../../controllers/galleryController.js'

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any

describe('normalizeProgramPhoto', () => {
  it('accepts the four program ids', () => {
    for (const id of ['foundations', 'fat_loss', 'endurance', 'hiking']) {
      expect(normalizeProgramPhoto(id, 'image')).toBe(id)
    }
  })

  it('returns null for empty or unknown values', () => {
    expect(normalizeProgramPhoto('')).toBeNull()
    expect(normalizeProgramPhoto(null)).toBeNull()
    expect(normalizeProgramPhoto(undefined)).toBeNull()
    expect(normalizeProgramPhoto('couch-to-5k')).toBeNull()
    expect(normalizeProgramPhoto(42)).toBeNull()
  })

  it('never assigns a video', () => {
    expect(normalizeProgramPhoto('hiking', 'video')).toBeNull()
  })
})

describe('gallery program photos', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset()
  })

  it('returns a map of program id to image url', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      rows: [
        { program_photo: 'hiking', media_url: 'https://img/hike.jpg' },
        { program_photo: 'bogus', media_url: 'https://img/x.jpg' },
      ],
    } as any)
    const res = makeRes()
    await getProgramPhotos({} as any, res)
    expect(res.json).toHaveBeenCalledWith({ hiking: 'https://img/hike.jpg' })
  })

  it('clears the program from other rows before assigning it', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'g1', program_photo: 'fat_loss' }] } as any)
    const res = makeRes()
    await updateMedia(
      { params: { id: 'g1' }, body: { caption: 'x', media_type: 'image', program_photo: 'fat_loss' } } as any,
      res
    )
    const [clearSql, clearParams] = vi.mocked(query).mock.calls[0] as any[]
    expect(clearSql).toContain('SET program_photo = NULL')
    expect(clearParams).toEqual(['fat_loss', 'g1'])
    const [, updateParams] = vi.mocked(query).mock.calls[1] as any[]
    expect(updateParams[4]).toBe('fat_loss')
    expect(res.json).toHaveBeenCalledWith({ id: 'g1', program_photo: 'fat_loss' })
  })

  it('stores null and skips the clear when no program is chosen', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{ id: 'g1' }] } as any)
    const res = makeRes()
    await updateMedia(
      { params: { id: 'g1' }, body: { caption: 'x', media_type: 'image', program_photo: '' } } as any,
      res
    )
    expect(vi.mocked(query)).toHaveBeenCalledTimes(1)
    const [, params] = vi.mocked(query).mock.calls[0] as any[]
    expect(params[4]).toBeNull()
  })
})
