import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))
vi.mock('../../utils/emailService.js', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))
vi.mock('../../utils/cloudinary.js', () => ({
  signVideoUpload: vi.fn(() => ({ signature: 'sig', timestamp: 1, folder: 'trfc_coach_videos' })),
  getVideoBytes: vi.fn(async () => 1000),
  deleteVideo: vi.fn(async () => undefined),
}))

import { query } from '../../config/db.js'
import { sendEmail } from '../../utils/emailService.js'
import {
  MIN_FILL_MS,
  buildHiringWhere,
  cleanApplication,
  isLikelySpam,
  isOwnCoachVideo,
  parseHiringFilters,
  toHiringCsvRow,
} from '../../utils/coachApplications.js'
import { sendCoachApplicationEmails } from '../../utils/coachApplicationEmail.js'
import { createCoachApplication } from '../../controllers/coachApplicationsController.js'

const CLOUD = 'democloud'
const UPLOAD_URL = `https://res.cloudinary.com/${CLOUD}/video/upload/v1700000000/trfc_coach_videos/abc123.mp4`

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    fullName: '  Jane Wanjiru ',
    phone: '0712 345 678',
    email: 'Jane@Example.com',
    location: 'Roysambu',
    socialUrl: 'https://instagram.com/jane',
    experience: 'Two years coaching a running club.',
    canGive3Hours: true,
    hours: ['evening', 'morning'],
    workedHarder: 'Trained for a marathon while working nights.',
    video: { source: 'link', url: 'https://youtu.be/abcdefghijk' },
    agreeStandards: true,
    agreeStorage: true,
    submissionKey: '3f2a6c1e-1111-4111-8111-111111111111',
    website: '',
    startedAt: Date.now() - 60_000,
    ...overrides,
  }
}

describe('cleanApplication', () => {
  it('accepts a full application and tidies it', () => {
    const result = cleanApplication(validBody(), CLOUD)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toMatchObject({
      fullName: 'Jane Wanjiru',
      phone: '254712345678',
      email: 'jane@example.com',
      hours: ['morning', 'evening'],
      videoSource: 'link',
      videoPublicId: null,
    })
  })

  it('reports every missing answer by field', () => {
    const result = cleanApplication({}, CLOUD)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.errors).sort()).toEqual(
      [
        'agreeStandards',
        'agreeStorage',
        'canGive3Hours',
        'email',
        'experience',
        'form',
        'fullName',
        'hours',
        'location',
        'phone',
        'socialUrl',
        'video',
        'workedHarder',
      ].sort()
    )
  })

  it('rejects a bad email, phone, social link and unknown hours', () => {
    const result = cleanApplication(
      validBody({ email: 'not-an-email', phone: '12345', socialUrl: 'http://instagram.com/jane', hours: ['night'] }),
      CLOUD
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toHaveProperty('email')
    expect(result.errors).toHaveProperty('phone')
    expect(result.errors).toHaveProperty('socialUrl')
    expect(result.errors).toHaveProperty('hours')
  })

  it('needs both tick boxes to be true, not just truthy', () => {
    const result = cleanApplication(validBody({ agreeStandards: 'yes', agreeStorage: false }), CLOUD)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toHaveProperty('agreeStandards')
    expect(result.errors).toHaveProperty('agreeStorage')
  })

  it('only accepts uploads from our own Cloudinary coach video folder', () => {
    const ok = cleanApplication(validBody({ video: { source: 'upload', url: UPLOAD_URL, publicId: 'trfc_coach_videos/abc123' } }), CLOUD)
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.value.videoPublicId).toBe('trfc_coach_videos/abc123')

    const otherCloud = cleanApplication(
      validBody({ video: { source: 'upload', url: UPLOAD_URL.replace(CLOUD, 'evil'), publicId: 'trfc_coach_videos/abc123' } }),
      CLOUD
    )
    expect(otherCloud.ok).toBe(false)

    const otherFolder = cleanApplication(
      validBody({ video: { source: 'upload', url: UPLOAD_URL.replace('trfc_coach_videos', 'trfc_events'), publicId: 'trfc_events/abc123' } }),
      CLOUD
    )
    expect(otherFolder.ok).toBe(false)
  })

  it('needs video links to be https', () => {
    const result = cleanApplication(validBody({ video: { source: 'link', url: 'http://example.com/me.mp4' } }), CLOUD)
    expect(result.ok).toBe(false)
  })

  it('isOwnCoachVideo refuses when no cloud is configured', () => {
    expect(isOwnCoachVideo(UPLOAD_URL, 'trfc_coach_videos/abc123', '')).toBe(false)
  })
})

describe('isLikelySpam', () => {
  const now = 1_000_000
  it('flags a filled honeypot', () => {
    expect(isLikelySpam({ website: 'http://spam', startedAt: now - 60_000 }, now)).toBe(true)
  })
  it('flags forms sent too fast or without a start time', () => {
    expect(isLikelySpam({ startedAt: now - (MIN_FILL_MS - 1) }, now)).toBe(true)
    expect(isLikelySpam({}, now)).toBe(true)
  })
  it('lets a normal person through', () => {
    expect(isLikelySpam({ website: '', startedAt: now - 90_000 }, now)).toBe(false)
  })
})

describe('hiring filters', () => {
  it('drops invalid values', () => {
    expect(parseHiringFilters({ status: 'hired', hours: 'night', threeHours: 'maybe', from: '01/02/2026', q: '  ' })).toEqual({})
  })

  it('binds every value as a parameter', () => {
    const filters = parseHiringFilters({ status: 'reviewing', hours: 'evening', threeHours: 'no', from: '2026-11-01', to: '2026-11-30', q: "0712' OR 1=1" })
    const { where, params } = buildHiringWhere(filters)
    expect(where).not.toContain('OR 1=1')
    expect(where).toContain('a.status = $1')
    expect(where).toContain('$2 = ANY(a.hours)')
    expect(where).toContain('a.can_give_3_hours = $3')
    expect(params.slice(0, 5)).toEqual(['reviewing', 'evening', false, '2026-11-01', '2026-11-30'])
  })

  it('leaves status out of the per-status counts', () => {
    const { where, params } = buildHiringWhere({ status: 'new' }, { ignoreStatus: true })
    expect(where).toBe('')
    expect(params).toEqual([])
  })

  it('formats CSV rows with labels', () => {
    expect(toHiringCsvRow({ can_give_3_hours: false, hours: ['morning', 'evening'], status: 'call_booked' })).toMatchObject({
      three_hours: 'No',
      hours_label: 'Morning, Evening',
      status_label: 'Call booked',
    })
  })
})

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const calls = (match: string) => vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes(match))

describe('createCoachApplication', () => {
  let existingKey: string | null
  beforeEach(() => {
    vi.clearAllMocks()
    existingKey = null
    vi.mocked(query).mockImplementation((async (sql: string, params?: unknown[]) => {
      if (sql.startsWith('SELECT id FROM coach_applications WHERE submission_key')) {
        return { rows: existingKey === params?.[0] ? [{ id: 'app-1' }] : [] }
      }
      if (sql.includes('INSERT INTO coach_applications')) {
        existingKey = String(params?.[12])
        return { rows: [{ id: 'app-1' }] }
      }
      return { rows: [] }
    }) as any)
  })

  it('saves once when the same form is sent twice', async () => {
    const body = validBody()
    const first = makeRes()
    await createCoachApplication({ body, ip: '1.2.3.4' } as any, first)
    expect(first.status).toHaveBeenCalledWith(201)

    const second = makeRes()
    await createCoachApplication({ body, ip: '1.2.3.4' } as any, second)
    expect(second.status).toHaveBeenCalledWith(200)
    expect(second.json).toHaveBeenCalledWith({ ok: true })
    expect(calls('INSERT INTO coach_applications')).toHaveLength(1)
  })

  it('pretends to accept spam without saving it', async () => {
    const res = makeRes()
    await createCoachApplication({ body: validBody({ website: 'buy now' }) } as any, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(query).not.toHaveBeenCalled()
  })

  it('returns field errors for a bad form', async () => {
    const res = makeRes()
    await createCoachApplication({ body: validBody({ email: 'nope' }) } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].errors).toHaveProperty('email')
    expect(calls('INSERT INTO coach_applications')).toHaveLength(0)
  })
})

describe('upload checks', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('rejects and deletes an uploaded video that is too big', async () => {
    vi.doMock('../../config/env.js', async (importOriginal) => {
      const actual: any = await importOriginal()
      return { ...actual, config: { ...actual.config, cloudinary: { ...actual.config.cloudinary, cloudName: CLOUD } } }
    })
    const { createCoachApplication: create } = await import('../../controllers/coachApplicationsController.js')
    const db = await import('../../config/db.js')
    const cloud = await import('../../utils/cloudinary.js')
    vi.mocked(db.query).mockResolvedValue({ rows: [] } as any)
    vi.mocked(cloud.getVideoBytes).mockResolvedValue(500 * 1024 * 1024)

    const res = makeRes()
    await create(
      { body: validBody({ video: { source: 'upload', url: UPLOAD_URL, publicId: 'trfc_coach_videos/abc123' } }) } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].errors).toHaveProperty('video')
    expect(cloud.deleteVideo).toHaveBeenCalledWith('trfc_coach_videos/abc123')
    vi.doUnmock('../../config/env.js')
  })
})

describe('sendCoachApplicationEmails', () => {
  const ROW = {
    id: 'app-1',
    full_name: 'Jane <b>Wanjiru</b>',
    phone: '254712345678',
    email: 'jane@example.com',
    location: 'Roysambu',
    social_url: 'https://instagram.com/jane',
    can_give_3_hours: true,
    hours: ['morning'],
    video_url: 'https://youtu.be/abcdefghijk',
  }

  beforeEach(() => vi.clearAllMocks())

  it('emails the applicant and the chosen admin, escaping their answers', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('FROM coach_applications')) return { rows: [ROW] }
      if (sql.includes('FROM hiring_settings')) return { rows: [{ email: 'boss@trfc.co.ke' }] }
      return { rows: [] }
    }) as any)

    const sent = await sendCoachApplicationEmails('app-1')
    expect(sent).toEqual({ applicant: true, team: true })
    const recipients = vi.mocked(sendEmail).mock.calls.map(([opts]) => opts.to)
    expect(recipients).toEqual(['jane@example.com', 'boss@trfc.co.ke'])
    const applicantHtml = vi.mocked(sendEmail).mock.calls[0][0].html
    expect(applicantHtml).toContain('Thank you. We read every application.')
    expect(applicantHtml).not.toContain('<b>Wanjiru</b>')
    expect(vi.mocked(sendEmail).mock.calls[1][0].html).toContain('/admin/hiring?id=app-1')
  })

  it('skips the team email when no admin is chosen', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('FROM coach_applications')) return { rows: [ROW] }
      return { rows: [] }
    }) as any)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const sent = await sendCoachApplicationEmails('app-1')
    expect(sent).toEqual({ applicant: true, team: false })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
