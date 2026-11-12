import { Readable } from 'stream'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))
vi.mock('../../utils/cloudinary.js', () => ({
  uploadPrivatePdf: vi.fn(),
  signedPdfUrl: vi.fn(),
  deletePrivateRaw: vi.fn(),
}))

import { query } from '../../config/db.js'
import { deletePrivateRaw, signedPdfUrl, uploadPrivatePdf } from '../../utils/cloudinary.js'
import { downloadMemberGuide, listMemberGuides } from '../../controllers/memberPerksController.js'
import { createGuide, deleteGuide, receiveGuideFile, updateGuide } from '../../controllers/adminGuidesController.js'
import {
  MAX_GUIDE_BYTES,
  cleanGuideFileName,
  isPdf,
  memberGuideFromRow,
  parseGuideInput,
  parseGuideUpdate,
} from '../../utils/memberGuides.js'

const GUIDE_ID = '11111111-1111-4111-8111-111111111111'
const PDF = Buffer.from('%PDF-1.7\n%âãÏÓ\n1 0 obj')
const guideRow = {
  id: GUIDE_ID,
  title: 'Weekly grocery list',
  description: 'What to buy',
  category: 'grocery',
  public_id: 'trfc/member-guides/secret.pdf',
  file_name: 'Weekly grocery list.pdf',
  bytes: 2048,
  sort_order: 10,
  is_published: true,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-02T00:00:00Z',
}

function mockRes() {
  const res: any = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res
}

const calls: string[] = []
function mockDb(opts: { member?: boolean; guides?: any[] } = {}) {
  calls.length = 0
  vi.mocked(query).mockImplementation((async (sql: string) => {
    calls.push(sql)
    if (sql.includes('member_until > NOW()')) return { rows: [{ active: opts.member ?? true }] }
    if (sql.includes('FROM member_guides') || sql.includes('member_guides')) return { rows: opts.guides ?? [] }
    return { rows: [] }
  }) as any)
}

beforeEach(() => {
  vi.mocked(query).mockReset()
  vi.mocked(uploadPrivatePdf).mockReset()
  vi.mocked(signedPdfUrl).mockReset()
  vi.mocked(deletePrivateRaw).mockReset().mockResolvedValue(undefined)
})

describe('guide helpers', () => {
  it('recognises PDFs by their contents only', () => {
    expect(isPdf(PDF)).toBe(true)
    expect(isPdf(Buffer.from('<html><body>not a pdf</body></html>'))).toBe(false)
    expect(isPdf(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]))).toBe(false)
    expect(isPdf(Buffer.from('%PDF'))).toBe(false)
  })

  it('validates new guides', () => {
    expect(parseGuideInput({ title: ' Meal prep ', category: 'cooking' })).toEqual({
      ok: true,
      value: { title: 'Meal prep', description: '', category: 'cooking' },
    })
    expect(parseGuideInput({ title: '', category: 'cooking' })).toEqual({ ok: false, error: 'Give the guide a title' })
    expect(parseGuideInput({ title: 'X', category: 'recipes' })).toEqual({ ok: false, error: 'Pick a category' })
  })

  it('reads published flags sent as form strings', () => {
    expect(parseGuideUpdate({ isPublished: 'true' })).toEqual({ ok: true, value: { isPublished: true } })
    expect(parseGuideUpdate({ isPublished: 'maybe' }).ok).toBe(false)
  })

  it('keeps a readable download name', () => {
    expect(cleanGuideFileName('Week 1 <plan>.PDF', 'x')).toBe('Week 1 plan.pdf')
    expect(cleanGuideFileName(undefined, 'Mindset basics')).toBe('Mindset basics.pdf')
  })

  it('never exposes the storage id to members', () => {
    expect(memberGuideFromRow(guideRow)).not.toHaveProperty('publicId')
    expect(JSON.stringify(memberGuideFromRow(guideRow))).not.toContain('secret')
  })
})

describe('member guides', () => {
  it('refuses non-members', async () => {
    mockDb({ member: false, guides: [guideRow] })
    const res = mockRes()
    await listMemberGuides({ user: { id: 'u1' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(calls.some((sql) => sql.includes('member_guides'))).toBe(false)
  })

  it('lists published guides only, without public ids', async () => {
    mockDb({ guides: [guideRow] })
    const res = mockRes()
    await listMemberGuides({ user: { id: 'u1' } } as any, res)
    const sql = calls.find((s) => s.includes('FROM member_guides'))!
    expect(sql).toMatch(/WHERE is_published/)
    expect(sql).not.toContain('public_id')
    const body = res.json.mock.calls[0][0]
    expect(body).toHaveLength(1)
    expect(JSON.stringify(body)).not.toContain('secret')
  })

  it('refuses downloads for non-members', async () => {
    mockDb({ member: false, guides: [guideRow] })
    const res = mockRes()
    await downloadMemberGuide({ user: { id: 'u1' }, params: { id: GUIDE_ID } } as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(signedPdfUrl).not.toHaveBeenCalled()
  })

  it('hides unpublished guides from downloads', async () => {
    mockDb({ guides: [] })
    const res = mockRes()
    await downloadMemberGuide({ user: { id: 'u1' }, params: { id: GUIDE_ID } } as any, res)
    expect(calls.find((s) => s.includes('FROM member_guides'))).toMatch(/is_published/)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(signedPdfUrl).not.toHaveBeenCalled()
  })

  it('returns a signed link and nothing else', async () => {
    mockDb({ guides: [{ public_id: guideRow.public_id }] })
    vi.mocked(signedPdfUrl).mockReturnValue('https://api.cloudinary.com/signed')
    const res = mockRes()
    await downloadMemberGuide({ user: { id: 'u1' }, params: { id: GUIDE_ID } } as any, res)
    expect(signedPdfUrl).toHaveBeenCalledWith(guideRow.public_id)
    expect(res.json).toHaveBeenCalledWith({ url: 'https://api.cloudinary.com/signed' })
  })
})

describe('admin guide upload', () => {
  const body = { title: 'Weekly grocery list', category: 'grocery', description: '' }

  it('rejects files that are not PDFs', async () => {
    mockDb()
    const res = mockRes()
    const file = { buffer: Buffer.from('MZ\x90\x00 executable'), originalname: 'list.pdf', size: 20 }
    await createGuide({ body, file, user: { id: 'admin' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Upload the guide as a PDF file' })
    expect(uploadPrivatePdf).not.toHaveBeenCalled()
  })

  it('requires a file', async () => {
    mockDb()
    const res = mockRes()
    await createGuide({ body, user: { id: 'admin' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(uploadPrivatePdf).not.toHaveBeenCalled()
  })

  it('stores a PDF privately and creates it unpublished', async () => {
    mockDb({ guides: [{ ...guideRow, is_published: false }] })
    vi.mocked(uploadPrivatePdf).mockResolvedValue({ publicId: guideRow.public_id, bytes: 2048 })
    const res = mockRes()
    await createGuide({ body, file: { buffer: PDF, originalname: 'list.pdf', size: PDF.length }, user: { id: 'admin' } } as any, res)
    expect(uploadPrivatePdf).toHaveBeenCalledWith(PDF, 'trfc/member-guides')
    const insert = calls.find((s) => s.includes('INSERT INTO member_guides'))!
    expect(insert).not.toContain('is_published')
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0]).toMatchObject({ id: GUIDE_ID, isPublished: false })
  })

  it('removes the uploaded file when saving the row fails', async () => {
    vi.mocked(query).mockRejectedValue(new Error('db down'))
    vi.mocked(uploadPrivatePdf).mockResolvedValue({ publicId: 'orphan.pdf', bytes: 10 })
    const res = mockRes()
    await createGuide({ body, file: { buffer: PDF, originalname: 'list.pdf', size: PDF.length }, user: { id: 'admin' } } as any, res)
    expect(deletePrivateRaw).toHaveBeenCalledWith('orphan.pdf')
    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('rejects files over 25 MB before they reach the handler', async () => {
    const boundary = 'testboundary'
    const big = Buffer.alloc(MAX_GUIDE_BYTES + 1, 0x20)
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="big.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
      big,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ])
    const req: any = Readable.from([payload])
    req.headers = { 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': String(payload.length) }
    const res = mockRes()
    const next = vi.fn()
    await new Promise<void>((resolve) => {
      res.json = vi.fn(() => {
        resolve()
        return res
      })
      receiveGuideFile(req, res, () => {
        next()
        resolve()
      })
    })
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'The PDF must be 25 MB or smaller' })
  })

  it('swaps the file on replace and deletes the old one', async () => {
    mockDb({ guides: [guideRow] })
    vi.mocked(uploadPrivatePdf).mockResolvedValue({ publicId: 'trfc/member-guides/new.pdf', bytes: 4096 })
    const res = mockRes()
    await updateGuide(
      { params: { id: GUIDE_ID }, body: {}, file: { buffer: PDF, originalname: 'v2.pdf', size: PDF.length } } as any,
      res
    )
    expect(calls.find((s) => s.startsWith('UPDATE member_guides'))).toMatch(/public_id = \$1/)
    expect(deletePrivateRaw).toHaveBeenCalledWith(guideRow.public_id)
  })

  it('deletes the stored file with the guide', async () => {
    mockDb({ guides: [{ public_id: guideRow.public_id }] })
    const res = mockRes()
    await deleteGuide({ params: { id: GUIDE_ID } } as any, res)
    expect(deletePrivateRaw).toHaveBeenCalledWith(guideRow.public_id)
    expect(res.json).toHaveBeenCalledWith({ ok: true })
  })
})
