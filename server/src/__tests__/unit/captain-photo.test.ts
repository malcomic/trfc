import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))
vi.mock('../../utils/cloudinary.js', () => ({
  uploadToCloudinary: vi.fn(),
}))

import { query } from '../../config/db.js'
import { uploadToCloudinary } from '../../utils/cloudinary.js'
import {
  CAPTAIN_PHOTO_FOLDER,
  adminRemoveCaptainPhoto,
  removeMyCaptainPhoto,
  squareFaceUrl,
  uploadMyCaptainPhoto,
} from '../../controllers/captainPhotoController.js'

const CAPTAIN_ID = '33333333-3333-4333-8333-333333333333'
const UPLOADED = 'https://res.cloudinary.com/demo/image/upload/v1/trfc_captains/abc.jpg'
const SQUARE = 'https://res.cloudinary.com/demo/image/upload/c_fill,g_face,w_400,h_400,f_auto,q_auto/v1/trfc_captains/abc.jpg'

function mockRes() {
  const res: any = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('squareFaceUrl', () => {
  it('asks Cloudinary for a 400×400 square centred on the face', () => {
    expect(squareFaceUrl(UPLOADED)).toBe(SQUARE)
  })

  it('leaves other URLs alone', () => {
    expect(squareFaceUrl('https://example.com/me.jpg')).toBe('https://example.com/me.jpg')
  })
})

describe('uploadMyCaptainPhoto', () => {
  it('rejects a request without an accepted image', async () => {
    const res = mockRes()
    await uploadMyCaptainPhoto({ user: { id: CAPTAIN_ID } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(uploadToCloudinary).not.toHaveBeenCalled()
    expect(query).not.toHaveBeenCalled()
  })

  it('uploads to the captains folder and saves the square face URL', async () => {
    vi.mocked(uploadToCloudinary).mockResolvedValue(UPLOADED)
    vi.mocked(query).mockResolvedValue({ rows: [{ photo_url: SQUARE }] } as any)
    const buffer = Buffer.from('jpeg')
    const res = mockRes()

    await uploadMyCaptainPhoto({ user: { id: CAPTAIN_ID }, file: { buffer } } as any, res)

    expect(uploadToCloudinary).toHaveBeenCalledWith(buffer, CAPTAIN_PHOTO_FOLDER)
    expect(vi.mocked(query).mock.calls[0][1]).toEqual([CAPTAIN_ID, SQUARE])
    expect(res.json).toHaveBeenCalledWith({ photo_url: SQUARE })
  })

  it('returns 502 and saves nothing when Cloudinary returns no URL', async () => {
    vi.mocked(uploadToCloudinary).mockResolvedValue('')
    const res = mockRes()
    await uploadMyCaptainPhoto({ user: { id: CAPTAIN_ID }, file: { buffer: Buffer.from('x') } } as any, res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(query).not.toHaveBeenCalled()
  })
})

describe('removing a photo', () => {
  it('a captain can clear their own photo', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
    const res = mockRes()
    await removeMyCaptainPhoto({ user: { id: CAPTAIN_ID } } as any, res)
    expect(vi.mocked(query).mock.calls[0][0]).toContain('SET photo_url = NULL')
    expect(vi.mocked(query).mock.calls[0][1]).toEqual([CAPTAIN_ID])
    expect(res.json).toHaveBeenCalledWith({ photo_url: null })
  })

  it('an admin can remove any captain photo', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ user_id: CAPTAIN_ID }] } as any)
    const res = mockRes()
    await adminRemoveCaptainPhoto({ params: { id: CAPTAIN_ID } } as any, res)
    expect(vi.mocked(query).mock.calls[0][1]).toEqual([CAPTAIN_ID])
    expect(res.json).toHaveBeenCalledWith({ photo_url: null })
  })

  it('admin removal returns 404 for an unknown or invalid captain', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
    const unknown = mockRes()
    await adminRemoveCaptainPhoto({ params: { id: CAPTAIN_ID } } as any, unknown)
    expect(unknown.status).toHaveBeenCalledWith(404)

    const invalid = mockRes()
    await adminRemoveCaptainPhoto({ params: { id: 'nope' } } as any, invalid)
    expect(invalid.status).toHaveBeenCalledWith(404)
    expect(query).toHaveBeenCalledTimes(1)
  })
})
