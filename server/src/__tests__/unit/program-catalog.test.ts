import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { query } from '../../config/db.js'
import { getProgramBySlug, getProgramCatalog } from '../../controllers/programCatalogController.js'
import { CORE_PROGRAMS } from '../../config/programCatalogSeed.js'

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn(), set: vi.fn() }) as any
const makeReq = (params: Record<string, string> = {}, queryString: Record<string, string> = {}, role?: string) =>
  ({ params, query: queryString, user: role ? { id: 'u', role } : undefined }) as any

const HIKING = CORE_PROGRAMS[3]
const row = (status: string) => ({ id: HIKING.id, slug: HIKING.slug, name: HIKING.name, status, is_core: true, sort_order: 4 })
const draftContent = { ...structuredClone(HIKING.content), page: { ...HIKING.content.page, title: 'Draft title' } }

let status = 'published'

beforeEach(() => {
  status = 'published'
  vi.mocked(query).mockReset()
  vi.mocked(query).mockImplementation((async (sql: string, params: any[] = []) => {
    if (sql.includes('JOIN program_versions v')) {
      return { rows: CORE_PROGRAMS.map((p, i) => ({ ...row('published'), id: p.id, slug: p.slug, name: p.name, sort_order: i, content: p.content })) }
    }
    if (sql.includes('FROM programs WHERE id = $1 OR slug = $1')) {
      return { rows: params[0] === HIKING.slug || params[0] === HIKING.id ? [row(status)] : [] }
    }
    if (sql.includes("state = 'published'")) return { rows: [{ content: HIKING.content }] }
    if (sql.includes("state = 'draft'")) return { rows: [{ content: draftContent }] }
    return { rows: [] }
  }) as any)
})

describe('getProgramCatalog', () => {
  it('lists published programs without their weekly plans', async () => {
    const res = makeRes()
    await getProgramCatalog(makeReq(), res)
    const body = res.json.mock.calls[0][0]
    expect(body.map((p: any) => p.id)).toEqual(['foundations', 'fat_loss', 'endurance', 'hiking'])
    expect(body[0]).toMatchObject({ slug: 'couch-to-5k', weekCount: 8 })
    expect(body[0].page.title).toContain('Couch to 5K')
    expect(body[0]).not.toHaveProperty('weeks')
    expect(body[0]).not.toHaveProperty('plan')
  })
})

describe('getProgramBySlug', () => {
  it('returns the published page', async () => {
    const res = makeRes()
    await getProgramBySlug(makeReq({ slug: 'hiking' }), res)
    expect(res.json.mock.calls[0][0]).toMatchObject({ id: 'hiking', weekCount: 6, preview: false })
  })

  it('hides archived and draft programs from the public', async () => {
    for (const s of ['archived', 'draft']) {
      status = s
      const res = makeRes()
      await getProgramBySlug(makeReq({ slug: 'hiking' }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    }
  })

  it('shows the draft to admins who ask for a preview', async () => {
    status = 'draft'
    const res = makeRes()
    await getProgramBySlug(makeReq({ slug: 'hiking' }, { preview: 'draft' }, 'admin'), res)
    expect(res.json.mock.calls[0][0]).toMatchObject({ preview: true, page: { title: 'Draft title' } })
  })

  it('ignores the preview flag for members', async () => {
    const res = makeRes()
    await getProgramBySlug(makeReq({ slug: 'hiking' }, { preview: 'draft' }, 'member'), res)
    expect(res.json.mock.calls[0][0].page.title).toBe(HIKING.content.page.title)
  })

  it('returns 404 for an unknown slug', async () => {
    const res = makeRes()
    await getProgramBySlug(makeReq({ slug: 'nope' }), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })
})
