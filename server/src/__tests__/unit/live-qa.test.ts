import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))
vi.mock('../../controllers/paymentsController.js', () => ({
  sendStkPush: vi.fn(),
  stkErrorMessage: vi.fn(),
  InvalidMpesaPhoneError: class extends Error {},
}))
vi.mock('../../utils/membershipEmail.js', () => ({ sendMembershipWelcome: vi.fn() }))
vi.mock('../../utils/emailService.js', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))

import { query } from '../../config/db.js'
import { getPublicPerks, publicPerkFromRow } from '../../controllers/membershipController.js'
import { getLiveQa as getLiveQaEndpoint } from '../../controllers/memberPerksController.js'
import { updateLiveQa } from '../../controllers/adminLiveQaController.js'
import { liveQaView, parseLiveQaUpdate, reminderDue, sendLiveQaReminder, type LiveQa } from '../../utils/liveQa.js'

const HOUR = 60 * 60 * 1000
const SESSION = new Date('2026-12-03T16:00:00Z')
const ZOOM = 'https://zoom.us/j/123456789?pwd=secret'
const qa = (over: Partial<LiveQa> = {}): LiveQa => ({
  on: true,
  nextAt: SESSION,
  zoomUrl: ZOOM,
  title: 'December Q&A',
  notes: 'Bring your questions',
  ...over,
})
const at = (offsetMs: number) => new Date(SESSION.getTime() + offsetMs)
const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const liveQaPerkRow = {
  key: 'live_qa',
  title: 'Monthly live Q&A',
  description: '',
  status: 'on',
  sort_order: 10,
  icon: 'Video',
  link_url: null,
  button_label: null,
  settings: { zoom_url: ZOOM, next_at: SESSION.toISOString(), title: '', notes: '' },
}

beforeEach(() => {
  vi.mocked(query).mockReset()
})

describe('liveQaView', () => {
  it('gives members the link from 1 hour before until 2 hours after the start', () => {
    expect(liveQaView(qa(), true, at(-HOUR - 1000)).joinUrl).toBeNull()
    expect(liveQaView(qa(), true, at(-HOUR)).joinUrl).toBe(ZOOM)
    expect(liveQaView(qa(), true, at(0)).joinUrl).toBe(ZOOM)
    expect(liveQaView(qa(), true, at(2 * HOUR)).joinUrl).toBe(ZOOM)
    expect(liveQaView(qa(), true, at(2 * HOUR + 1000)).joinUrl).toBeNull()
  })

  it('never gives the link to non-members, but shows them the date', () => {
    const view = liveQaView(qa(), false, at(0))
    expect(view.joinUrl).toBeNull()
    expect(view.nextAt).toBe(SESSION.toISOString())
    expect(view.notes).toBe('')
  })

  it('shows nothing when the perk is off or the session is over', () => {
    expect(liveQaView(qa({ on: false }), true, at(0))).toMatchObject({ nextAt: null, joinUrl: null })
    expect(liveQaView(qa(), true, at(3 * HOUR))).toMatchObject({ nextAt: null, joinUrl: null })
  })
})

describe('member live Q&A endpoint', () => {
  function mockDb(member: boolean) {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('member_until > NOW()')) return { rows: [{ active: member }] }
      if (sql.includes('FROM member_perks')) return { rows: [{ status: 'on', settings: liveQaPerkRow.settings }] }
      return { rows: [] }
    }) as any)
  }

  it('keeps the link from non-members even during the session', async () => {
    vi.useFakeTimers({ now: at(0) })
    try {
      mockDb(false)
      const res = makeRes()
      await getLiveQaEndpoint({ user: { id: 'u1' } } as any, res)
      expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('zoom.us')
    } finally {
      vi.useRealTimers()
    }
  })

  it('gives members the link during the session', async () => {
    vi.useFakeTimers({ now: at(-30 * 60 * 1000) })
    try {
      mockDb(true)
      const res = makeRes()
      await getLiveQaEndpoint({ user: { id: 'u1' } } as any, res)
      expect(res.json.mock.calls[0][0]).toMatchObject({ joinUrl: ZOOM, isMember: true })
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('public perks', () => {
  it('strips the Zoom link from member-facing perks', () => {
    const perk = publicPerkFromRow(liveQaPerkRow)
    expect(perk.settings).not.toHaveProperty('zoom_url')
    expect(perk.settings).toHaveProperty('next_at')
  })

  it('never sends the Zoom link on the public perks endpoint', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('FROM member_perks')) return { rows: [liveQaPerkRow] }
      if (sql.includes('FROM membership_settings')) {
        return {
          rows: [
            {
              standard_price: 2447,
              founding_price: 1997,
              founding_limit: 100,
              founding_deadline: '2027-01-31T21:00:00Z',
              renewal_price: 1997,
              renewal_grace_days: 30,
              sales_open_at: '2026-01-01T00:00:00Z',
              sales_paused: false,
            },
          ],
        }
      }
      return { rows: [{ count: 0, taken: 0 }] }
    }) as any)
    const res = makeRes()
    await getPublicPerks({} as any, res)
    expect(res.status).not.toHaveBeenCalled()
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('zoom.us')
  })
})

describe('admin live Q&A', () => {
  const now = new Date('2026-11-10T09:00:00Z')

  it('needs a future date and an https link', () => {
    expect(parseLiveQaUpdate({ nextAt: '2026-11-01T16:00:00Z', zoomUrl: ZOOM }, now)).toEqual({ ok: false, error: 'The session must be in the future' })
    expect(parseLiveQaUpdate({ nextAt: SESSION.toISOString(), zoomUrl: 'http://zoom.us/j/1' }, now).ok).toBe(false)
    expect(parseLiveQaUpdate({ nextAt: SESSION.toISOString(), zoomUrl: ZOOM }, now)).toMatchObject({ ok: true, value: { nextAt: SESSION } })
    expect(parseLiveQaUpdate({ nextAt: '' }, now)).toMatchObject({ ok: true, value: { nextAt: null, zoomUrl: '' } })
  })

  it('saves into the perk settings', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.startsWith('UPDATE member_perks')) return { rows: [{ key: 'live_qa' }] }
      if (sql.includes('FROM member_perks')) return { rows: [{ status: 'on', settings: liveQaPerkRow.settings }] }
      return { rows: [] }
    }) as any)
    const res = makeRes()
    await updateLiveQa({ body: { nextAt: '2099-01-01T16:00:00Z', zoomUrl: ZOOM, title: 'T', notes: '' }, user: { id: 'admin' } } as any, res)
    const update = vi.mocked(query).mock.calls.find(([sql]) => String(sql).startsWith('UPDATE member_perks'))!
    expect(JSON.parse(update[1]![0] as string)).toEqual({ next_at: '2099-01-01T16:00:00.000Z', zoom_url: ZOOM, title: 'T', notes: '' })
    expect(res.json.mock.calls[0][0]).toMatchObject({ zoomUrl: ZOOM })
  })
})

describe('live Q&A reminder', () => {
  it('is due only 20 to 28 hours before the session', () => {
    expect(reminderDue(SESSION, at(-29 * HOUR))).toBe(false)
    expect(reminderDue(SESSION, at(-28 * HOUR))).toBe(true)
    expect(reminderDue(SESSION, at(-24 * HOUR))).toBe(true)
    expect(reminderDue(SESSION, at(-20 * HOUR))).toBe(true)
    expect(reminderDue(SESSION, at(-19 * HOUR))).toBe(false)
    expect(reminderDue(null, at(-24 * HOUR))).toBe(false)
  })

  function mockDb(opts: { status?: string; claimed: () => boolean }) {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('FROM member_perks')) return { rows: [{ status: opts.status ?? 'on', settings: liveQaPerkRow.settings }] }
      if (sql.includes('INSERT INTO live_qa_reminders')) return { rows: opts.claimed() ? [{ session_at: SESSION }] : [] }
      if (sql.includes('INSERT INTO announcements (')) return { rows: [{ id: 'ann-1' }] }
      if (sql.includes('INSERT INTO announcement_emails')) return { rows: [], rowCount: 12 }
      return { rows: [] }
    }) as any)
  }
  const announcementCalls = () => vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO announcements ('))

  it('posts one members-only announcement with email, once per session', async () => {
    let claims = 0
    mockDb({ claimed: () => ++claims === 1 })
    expect(await sendLiveQaReminder(at(-24 * HOUR))).toBe(true)
    expect(await sendLiveQaReminder(at(-23 * HOUR))).toBe(false)
    const posts = announcementCalls()
    expect(posts).toHaveLength(1)
    const params = posts[0][1] as unknown[]
    expect(params[2]).toBe('/dashboard/membership')
    expect(params.slice(4, 7)).toEqual(['news', 'members', true])
    expect(JSON.stringify(params)).not.toContain('zoom.us')
    const emails = vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('INSERT INTO announcement_emails'))!
    expect(String(emails[0])).toContain('u.member_until > NOW()')
  })

  it('does nothing outside the window or when the perk is off', async () => {
    mockDb({ claimed: () => true })
    expect(await sendLiveQaReminder(at(-40 * HOUR))).toBe(false)
    mockDb({ status: 'coming_soon', claimed: () => true })
    expect(await sendLiveQaReminder(at(-24 * HOUR))).toBe(false)
    expect(announcementCalls()).toHaveLength(0)
  })
})
