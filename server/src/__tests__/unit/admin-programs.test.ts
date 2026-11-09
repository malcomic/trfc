import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { getClient, query } from '../../config/db.js'
import * as admin from '../../controllers/adminProgramsController.js'
import { CORE_PROGRAMS } from '../../config/programCatalogSeed.js'
import type { ProgramContent } from '../../types/programContent.js'

const ADMIN_ID = '11111111-1111-4111-8111-111111111111'

interface FakeDb {
  program: Record<string, any> | null
  draft: { id: string; content: ProgramContent; updated_at: string } | null
  published: { id: string; content: ProgramContent; published_at: string } | null
  superseded: ProgramContent[]
  furthestCheckins: number
  slugTaken: boolean
  clock: number
}

let db: FakeDb

const tick = () => new Date(Date.UTC(2026, 10, 1, 0, 0, db.clock++)).toISOString()

function couch(): ProgramContent {
  return structuredClone(CORE_PROGRAMS[0].content)
}

function handle(sql: string, params: any[] = []): { rows: any[] } {
  const s = sql.replace(/\s+/g, ' ')
  if (/^(BEGIN|COMMIT|ROLLBACK)/.test(s)) return { rows: [] }

  if (s.includes("state IN ('draft', 'published')")) {
    const rows = []
    if (db.draft) rows.push({ state: 'draft', content: db.draft.content, updated_at: db.draft.updated_at, published_at: null })
    if (db.published) rows.push({ state: 'published', content: db.published.content, updated_at: null, published_at: db.published.published_at })
    return { rows }
  }
  if (s.includes('FROM programs WHERE id = $1 OR slug = $2')) return { rows: db.slugTaken ? [{}] : [] }
  if (s.includes('FROM programs WHERE slug = $1 AND id <> $2')) return { rows: db.slugTaken ? [{}] : [] }
  if (s.includes('FROM programs WHERE id = $1')) return { rows: db.program ? [db.program] : [] }
  if (s.includes('INSERT INTO programs')) {
    db.program = { id: params[0], slug: params[1], name: params[2], status: 'draft', is_core: false, sort_order: 9 }
    return { rows: [] }
  }
  if (s.includes('UPDATE programs SET name = $2')) {
    Object.assign(db.program!, { name: params[1], slug: params[2], sort_order: params[3] })
    return { rows: [] }
  }
  if (s.includes("UPDATE programs SET status = 'published'")) {
    db.program!.status = 'published'
    return { rows: [] }
  }
  if (s.includes("UPDATE programs SET status = 'archived'")) {
    db.program!.status = 'archived'
    return { rows: [] }
  }
  if (s.startsWith('UPDATE programs SET updated_at')) return { rows: [] }

  if (s.includes("state = 'draft' FOR UPDATE")) return { rows: db.draft ? [db.draft] : [] }
  if (s.includes("SELECT content FROM program_versions WHERE program_id = $1 AND state = 'published'")) {
    return { rows: db.published ? [{ content: db.published.content }] : [] }
  }
  if (s.includes("SELECT content FROM program_versions WHERE program_id = $1 AND state = 'draft'")) {
    return { rows: db.draft ? [{ content: db.draft.content }] : [] }
  }
  if (s.includes("SELECT 1 FROM program_versions WHERE program_id = $1 AND state = 'published'")) {
    return { rows: db.published ? [{}] : [] }
  }
  if (s.includes('INSERT INTO program_versions')) {
    db.draft = { id: `draft-${db.clock}`, content: JSON.parse(params[1]), updated_at: tick() }
    return { rows: [db.draft] }
  }
  if (s.includes("WHERE program_id = $1 AND state = 'draft' RETURNING id")) {
    if (!db.draft) return { rows: [] }
    db.draft = { ...db.draft, content: JSON.parse(params[1]), updated_at: tick() }
    return { rows: [{ id: db.draft.id }] }
  }
  if (s.includes('UPDATE program_versions SET content = $2, updated_by = $3')) {
    db.draft = { ...db.draft!, content: JSON.parse(params[1]), updated_at: tick() }
    return { rows: [{ updated_at: db.draft.updated_at }] }
  }
  if (s.includes("SET state = 'superseded'")) {
    if (db.published) db.superseded.push(db.published.content)
    db.published = null
    return { rows: [] }
  }
  if (s.includes("SET state = 'published', content = $2")) {
    db.published = { id: db.draft!.id, content: JSON.parse(params[1]), published_at: tick() }
    db.draft = null
    return { rows: [] }
  }
  if (s.includes("DELETE FROM program_versions WHERE program_id = $1 AND state = 'draft'")) {
    db.draft = null
    return { rows: [] }
  }
  if (s.includes('FROM program_enrollments')) return { rows: [{ count: 3 }] }
  if (s.includes('FROM program_checkins')) return { rows: [{ weeks: db.furthestCheckins }] }
  return { rows: [] }
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const makeReq = (params: Record<string, string>, body: any = {}) =>
  ({ params, body, user: { id: ADMIN_ID, email: 'a@b.c', role: 'admin' } }) as any

const writes = () =>
  vi.mocked(query).mock.calls.concat(clientQuery.mock.calls as any).filter(([sql]) => /UPDATE program_versions|INSERT INTO program_versions/.test(String(sql)))

const clientQuery = vi.fn(async (sql: string, params?: any[]) => handle(sql, params))

beforeEach(() => {
  db = {
    program: { id: 'foundations', slug: 'couch-to-5k', name: 'Couch to 5K', status: 'published', is_core: true, sort_order: 1 },
    draft: null,
    published: { id: 'pub-1', content: couch(), published_at: '2026-10-01T00:00:00.000Z' },
    superseded: [],
    furthestCheckins: 0,
    slugTaken: false,
    clock: 0,
  }
  vi.mocked(query).mockReset()
  vi.mocked(query).mockImplementation((async (sql: string, params?: any[]) => handle(sql, params)) as any)
  clientQuery.mockClear()
  vi.mocked(getClient).mockResolvedValue({ query: clientQuery, release: vi.fn() } as any)
})

describe('draft saves', () => {
  it('creates the draft from the published version on the first save', async () => {
    const res = makeRes()
    const page = { ...couch().page, tagline: '  A new tagline  ' }
    await admin.saveDraftSection(makeReq({ id: 'foundations', section: 'page' }, { value: page, expectedUpdatedAt: null }), res)
    const body = res.json.mock.calls[0][0]
    expect(body.content.page.tagline).toBe('A new tagline')
    expect(body.draftUpdatedAt).toBeTruthy()
    expect(db.draft?.content.page.tagline).toBe('A new tagline')
    expect(db.published?.content.page.tagline).toBe(couch().page.tagline)
  })

  it('refuses to overwrite a draft that changed since the editor loaded it', async () => {
    db.draft = { id: 'd1', content: couch(), updated_at: '2026-11-01T10:00:00.000Z' }
    const res = makeRes()
    await admin.saveDraftSection(
      makeReq({ id: 'foundations', section: 'card' }, { value: couch().card, expectedUpdatedAt: '2026-11-01T09:00:00.000Z' }),
      res
    )
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json.mock.calls[0][0]).toMatchObject({ conflict: true })
  })

  it('rejects invalid content without writing anything', async () => {
    const res = makeRes()
    await admin.saveDraftSection(makeReq({ id: 'foundations', section: 'page' }, { value: { ...couch().page, price: -5 } }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(writes()).toHaveLength(0)
  })

  it('rejects unknown sections', async () => {
    const res = makeRes()
    await admin.saveDraftSection(makeReq({ id: 'foundations', section: 'weeks' }, { value: [] }), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('saves one week at its position', async () => {
    const week = { ...couch().weeks[1], title: 'Rhythm' }
    const res = makeRes()
    await admin.saveDraftWeek(makeReq({ id: 'foundations', week: '2' }, { value: week }), res)
    expect(db.draft?.content.weeks[1]).toMatchObject({ week: 2, title: 'Rhythm' })
  })
})

describe('weeks', () => {
  it('copies a week to the end', async () => {
    const res = makeRes()
    await admin.addDraftWeek(makeReq({ id: 'foundations' }, { copyFrom: 1 }), res)
    expect(res.status).toHaveBeenCalledWith(201)
    const weeks = db.draft!.content.weeks
    expect(weeks).toHaveLength(9)
    expect(weeks[8]).toMatchObject({ week: 9, title: "Let's start (copy)" })
  })

  it('renumbers the weeks after a removal', async () => {
    await admin.removeDraftWeek(makeReq({ id: 'foundations', week: '1' }, {}), makeRes())
    const weeks = db.draft!.content.weeks
    expect(weeks).toHaveLength(7)
    expect(weeks.map((w) => w.week)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(weeks[0].title).toBe('Find your rhythm')
  })

  it('moves a week up', async () => {
    await admin.moveDraftWeek(makeReq({ id: 'foundations', week: '2' }, { direction: 'up' }), makeRes())
    expect(db.draft!.content.weeks.slice(0, 2).map((w) => [w.week, w.title])).toEqual([
      [1, 'Find your rhythm'],
      [2, "Let's start"],
    ])
  })
})

describe('publishing', () => {
  it('asks to confirm warnings, then replaces the live version', async () => {
    db.draft = { id: 'd1', content: { ...couch(), page: { ...couch().page, tagline: 'New' } }, updated_at: tick() }

    const first = makeRes()
    await admin.publishProgram(makeReq({ id: 'foundations' }, {}), first)
    expect(first.status).toHaveBeenCalledWith(409)
    expect(first.json.mock.calls[0][0]).toMatchObject({ needsConfirm: true })
    expect(db.published?.content.page.tagline).not.toBe('New')

    const second = makeRes()
    await admin.publishProgram(makeReq({ id: 'foundations' }, { acceptWarnings: true }), second)
    expect(db.published?.content.page.tagline).toBe('New')
    expect(db.draft).toBeNull()
    expect(db.superseded).toHaveLength(1)
    expect(second.json.mock.calls[0][0]).toMatchObject({ hasDraft: false, hasPublished: true })
  })

  it('blocks publishing when there are errors', async () => {
    db.draft = { id: 'd1', content: { ...couch(), page: { ...couch().page, title: '' } }, updated_at: tick() }
    const res = makeRes()
    await admin.publishProgram(makeReq({ id: 'foundations' }, { acceptWarnings: true }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].errors[0]).toMatchObject({ where: 'Public page', message: 'Add a title' })
  })

  it('warns when members are further along than the new plan', async () => {
    db.furthestCheckins = 5
    const content = couch()
    content.weeks = content.weeks.slice(0, 3)
    db.draft = { id: 'd1', content, updated_at: tick() }
    const res = makeRes()
    await admin.getPublishCheck(makeReq({ id: 'foundations' }), res)
    expect(res.json.mock.calls[0][0].warnings.some((w: any) => w.message.includes('finished 5 weeks'))).toBe(true)
  })
})

describe('discard, archive and restore', () => {
  it('will not discard the only version of a never-published program', async () => {
    db.published = null
    db.draft = { id: 'd1', content: couch(), updated_at: tick() }
    const res = makeRes()
    await admin.discardDraft(makeReq({ id: 'foundations' }), res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(db.draft).not.toBeNull()
  })

  it('never archives the free starting program', async () => {
    const res = makeRes()
    await admin.archiveProgram(makeReq({ id: 'foundations' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(db.program!.status).toBe('published')
  })

  it('archives other programs', async () => {
    db.program = { ...db.program!, id: 'hiking', slug: 'hiking' }
    await admin.archiveProgram(makeReq({ id: 'hiking' }), makeRes())
    expect(db.program.status).toBe('archived')
  })

  it('refuses a version id that is not a uuid', async () => {
    const res = makeRes()
    await admin.restoreProgramVersion(makeReq({ id: 'foundations', versionId: "1' OR 1=1" }), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('createAdminProgram', () => {
  it('creates a draft program with blank weeks', async () => {
    db.program = null
    db.published = null
    const res = makeRes()
    await admin.createAdminProgram(makeReq({}, { name: 'Strength for Runners', lengthWeeks: 3 }), res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(db.program).toMatchObject({ id: 'strength_for_runners', slug: 'strength-for-runners', status: 'draft' })
    expect(db.draft?.content.weeks).toHaveLength(3)
    expect(db.draft?.content.page.title).toBe('Strength for Runners')
  })

  it('refuses a web address that is already used', async () => {
    db.slugTaken = true
    const res = makeRes()
    await admin.createAdminProgram(makeReq({}, { name: 'Hiking' }), res)
    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('refuses a missing name', async () => {
    const res = makeRes()
    await admin.createAdminProgram(makeReq({}, { name: ' ' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('updateProgramSettings', () => {
  it('keeps the web address of core programs', async () => {
    const res = makeRes()
    await admin.updateProgramSettings(makeReq({ id: 'foundations' }, { slug: 'c25k' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(db.program!.slug).toBe('couch-to-5k')
  })

  it('renames a program', async () => {
    await admin.updateProgramSettings(makeReq({ id: 'foundations' }, { name: 'Couch to 5K Challenge', sortOrder: 2 }), makeRes())
    expect(db.program).toMatchObject({ name: 'Couch to 5K Challenge', sort_order: 2, slug: 'couch-to-5k' })
  })
})
