import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))
vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn(async () => ({ success: true, messageId: 'm1' })),
}))

import { query } from '../../config/db.js'
import {
  audienceSql,
  emailRecipientsSql,
  parseAnnouncementInput,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from '../../utils/announcements.js'
import {
  createAnnouncement,
  getMyAnnouncements,
  markAnnouncementsRead,
  unsubscribeFromMarketing,
} from '../../controllers/announcementsController.js'
import { buildAnnouncementEmailHTML, buildAnnouncementEmailText, siteUrl } from '../../utils/emailTemplates.js'

const ADMIN_ID = '11111111-1111-4111-8111-111111111111'
const USER_ID = '22222222-2222-4222-8222-222222222222'
const ANNOUNCEMENT_ID = '33333333-3333-4333-8333-333333333333'

const VALID = {
  title: 'Saturday run moves to 6:30am',
  body: 'See you at the usual spot.',
  kind: 'important',
  audience: 'all',
  send_email: true,
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const callsMatching = (fragment: string) =>
  vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes(fragment))

describe('parseAnnouncementInput', () => {
  it('accepts a valid announcement and trims fields', () => {
    expect(parseAnnouncementInput({ ...VALID, title: '  Hello there  ', link_url: '', link_label: '' })).toEqual({
      title: 'Hello there',
      body: VALID.body,
      linkUrl: null,
      linkLabel: null,
      kind: 'important',
      audience: 'all',
      sendEmail: true,
    })
  })

  it('only sends email when send_email is exactly true', () => {
    const input = parseAnnouncementInput({ ...VALID, send_email: 'true' })
    expect(typeof input !== 'string' && input.sendEmail).toBe(false)
  })

  it('rejects short titles, empty bodies and unknown kinds or audiences', () => {
    expect(parseAnnouncementInput({ ...VALID, title: 'Hi' })).toMatch(/title/)
    expect(parseAnnouncementInput({ ...VALID, body: '   ' })).toMatch(/message/)
    expect(parseAnnouncementInput({ ...VALID, body: 'x'.repeat(5001) })).toMatch(/5000/)
    expect(parseAnnouncementInput({ ...VALID, kind: 'promo' })).toMatch(/important notice or news/)
    expect(parseAnnouncementInput({ ...VALID, audience: 'admins' })).toMatch(/who should get/)
  })

  it('allows site paths and https links only', () => {
    const withLink = (link_url: string) => parseAnnouncementInput({ ...VALID, link_url, link_label: 'Open' })
    expect(typeof withLink('/events')).toBe('object')
    expect(typeof withLink('https://example.com/race')).toBe('object')
    expect(withLink('javascript:alert(1)')).toMatch(/https/)
    expect(withLink('http://example.com')).toMatch(/https/)
    expect(withLink('//evil.example.com')).toMatch(/https/)
  })

  it('needs both a link and a label', () => {
    expect(parseAnnouncementInput({ ...VALID, link_url: '/events' })).toMatch(/label/)
    expect(parseAnnouncementInput({ ...VALID, link_label: 'Open' })).toMatch(/link/)
  })
})

describe('audience and recipient SQL', () => {
  it('uses the membership rule for members and free accounts', () => {
    expect(audienceSql('all')).toBe('TRUE')
    expect(audienceSql('members')).toBe('u.member_until > NOW()')
    expect(audienceSql('free')).toBe('(u.member_until IS NULL OR u.member_until <= NOW())')
  })

  it('only emails news to people who opted in', () => {
    expect(emailRecipientsSql('important')).not.toContain('marketing_opt_in')
    expect(emailRecipientsSql('news')).toContain('u.marketing_opt_in = true')
    expect(emailRecipientsSql('news')).toContain('u.email IS NOT NULL')
  })
})

describe('createAnnouncement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('INSERT INTO announcements ')) return { rows: [{ id: ANNOUNCEMENT_ID }] }
      if (sql.includes('INSERT INTO announcement_emails')) return { rows: [], rowCount: 42 }
      return { rows: [] }
    }) as any)
  })

  it('queues one email per recipient in the audience', async () => {
    const res = makeRes()
    await createAnnouncement({ body: { ...VALID, kind: 'news', audience: 'members' }, user: { id: ADMIN_ID } } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ announcement: { id: ANNOUNCEMENT_ID }, queued: 42 })
    const [sql, params] = callsMatching('INSERT INTO announcement_emails')[0]
    expect(String(sql)).toContain(audienceSql('members'))
    expect(String(sql)).toContain('u.marketing_opt_in = true')
    expect(String(sql)).toContain('ON CONFLICT DO NOTHING')
    expect(params).toEqual([ANNOUNCEMENT_ID])
  })

  it('queues nothing when email is off', async () => {
    const res = makeRes()
    await createAnnouncement({ body: { ...VALID, send_email: false }, user: { id: ADMIN_ID } } as any, res)

    expect(res.json).toHaveBeenCalledWith({ announcement: { id: ANNOUNCEMENT_ID }, queued: 0 })
    expect(callsMatching('INSERT INTO announcement_emails')).toHaveLength(0)
  })

  it('rejects invalid input without touching the database', async () => {
    const res = makeRes()
    await createAnnouncement({ body: { ...VALID, title: '' }, user: { id: ADMIN_ID } } as any, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(query).not.toHaveBeenCalled()
  })
})

describe('member visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('only lists unarchived announcements sent after the member joined, for their audience', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        { id: 'a', read: false },
        { id: 'b', read: true },
      ],
    } as any)
    const res = makeRes()
    await getMyAnnouncements({ user: { id: USER_ID } } as any, res)

    const [sql, params] = vi.mocked(query).mock.calls[0]
    expect(String(sql)).toContain('a.archived_at IS NULL')
    expect(String(sql)).toContain('a.published_at >= u.created_at')
    expect(String(sql)).toContain(`a.audience = 'members' AND ${audienceSql('members')}`)
    expect(params).toEqual([USER_ID])
    expect(res.json).toHaveBeenCalledWith({ items: [{ id: 'a', read: false }, { id: 'b', read: true }], unread: 1 })
  })

  it('marks only visible announcements as read', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
    const res = makeRes()
    await markAnnouncementsRead({ user: { id: USER_ID }, body: { ids: [ANNOUNCEMENT_ID] } } as any, res)

    const [sql, params] = callsMatching('INSERT INTO announcement_reads')[0]
    expect(String(sql)).toContain('a.published_at >= u.created_at')
    expect(String(sql)).toContain('a.id = ANY($2::uuid[])')
    expect(params).toEqual([USER_ID, [ANNOUNCEMENT_ID]])
  })

  it('rejects ids that are not uuids', async () => {
    const res = makeRes()
    await markAnnouncementsRead({ user: { id: USER_ID }, body: { ids: ['1 OR 1=1'] } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(query).not.toHaveBeenCalled()
  })
})

describe('unsubscribe tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
  })

  it('round-trips the user id', () => {
    expect(verifyUnsubscribeToken(signUnsubscribeToken(USER_ID))).toBe(USER_ID)
  })

  it('rejects garbage and missing tokens', () => {
    expect(verifyUnsubscribeToken('not-a-token')).toBeNull()
    expect(verifyUnsubscribeToken(undefined)).toBeNull()
    expect(verifyUnsubscribeToken(123)).toBeNull()
  })

  it('turns off marketing for the token owner', async () => {
    const res = makeRes()
    await unsubscribeFromMarketing({ body: { token: signUnsubscribeToken(USER_ID) } } as any, res)

    const [sql, params] = callsMatching('UPDATE users SET marketing_opt_in = false')[0]
    expect(String(sql)).toContain('marketing_opt_in_at = NULL')
    expect(params).toEqual([USER_ID])
    expect(res.json).toHaveBeenCalledWith({ ok: true })
  })

  it('returns 400 for an invalid token', async () => {
    const res = makeRes()
    await unsubscribeFromMarketing({ body: { token: 'nope' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(query).not.toHaveBeenCalled()
  })
})

describe('announcement email', () => {
  const base = {
    title: 'Race <day>',
    body: 'First line\nsecond line\n\n<script>alert(1)</script>',
    linkUrl: '/events',
    linkLabel: 'See events',
    kind: 'important' as const,
    unsubscribeToken: null,
  }

  it('escapes the content and keeps line breaks', () => {
    const html = buildAnnouncementEmailHTML(base)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('Race &lt;day&gt;')
    expect(html).toContain('First line<br>second line')
  })

  it('makes site paths absolute and links to the dashboard', () => {
    const html = buildAnnouncementEmailHTML(base)
    expect(html).toContain(siteUrl('/events'))
    expect(html).toContain(siteUrl('/dashboard/notifications'))
    expect(buildAnnouncementEmailText(base)).toContain(`See events: ${siteUrl('/events')}`)
  })

  it('adds an unsubscribe link to news only', () => {
    expect(buildAnnouncementEmailHTML(base)).not.toContain('/unsubscribe')
    const news = { ...base, kind: 'news' as const, unsubscribeToken: 'tok.en' }
    expect(buildAnnouncementEmailHTML(news)).toContain(siteUrl('/unsubscribe?token=tok.en'))
    expect(buildAnnouncementEmailText(news)).toContain(siteUrl('/unsubscribe?token=tok.en'))
  })
})
