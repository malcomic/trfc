import { describe, it, expect, vi, beforeEach } from 'vitest'

const client = { query: vi.fn(), release: vi.fn() }
vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn(async () => client) }))
vi.mock('../../controllers/paymentsController.js', () => ({
  sendStkPush: vi.fn(),
  stkErrorMessage: vi.fn(),
  InvalidMpesaPhoneError: class extends Error {},
}))
vi.mock('../../utils/membershipEmail.js', () => ({ sendMembershipWelcome: vi.fn() }))
vi.mock('../../utils/emailService.js', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))

import { query } from '../../config/db.js'
import { sendEmail } from '../../utils/emailService.js'
import { cancel, grant, updatePerk, updateSettings } from '../../controllers/adminMembershipController.js'
import { isSafeLink, parseMembershipSettings, parsePerkUpdate } from '../../utils/membershipAdmin.js'
import { getLocalPaymentStatus } from '../../utils/paymentStatus.js'
import { sendMembershipReminders } from '../../jobs/membershipJobs.js'

const ADMIN = '11111111-1111-4111-8111-111111111111'
const USER = '22222222-2222-4222-8222-222222222222'
const MEMBERSHIP = '33333333-3333-4333-8333-333333333333'
const DAY = 24 * 60 * 60 * 1000

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn(), setHeader: vi.fn() }) as any
const calls = (fn: { mock: { calls: unknown[][] } }, match: string) => fn.mock.calls.filter(([sql]) => String(sql).includes(match))

const VALID_SETTINGS = {
  standardPrice: 2447,
  foundingPrice: 1997,
  renewalPrice: 1997,
  foundingLimit: 100,
  foundingDeadline: '2026-12-31T20:59:59.000Z',
  renewalGraceDays: 30,
  salesOpenAt: '2026-11-30T21:00:00.000Z',
  salesPaused: false,
}

describe('membership settings validation', () => {
  it('accepts valid settings', () => {
    expect(parseMembershipSettings(VALID_SETTINGS).ok).toBe(true)
  })

  it.each([
    [{ standardPrice: 0 }, 'Standard price'],
    [{ renewalPrice: -5 }, 'Renewal price'],
    [{ foundingLimit: 2.5 }, 'Founding places'],
    [{ renewalGraceDays: 400 }, 'Renewal days'],
    [{ foundingDeadline: 'not a date' }, 'founding deadline'],
    [{ salesOpenAt: '' }, 'opening date'],
    [{ salesPaused: 'yes' }, 'Pause'],
  ])('rejects %o', (patch, message) => {
    const result = parseMembershipSettings({ ...VALID_SETTINGS, ...patch })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain(message)
  })

  it('returns 400 from the controller without touching the database', async () => {
    const res = makeRes()
    await updateSettings({ body: { ...VALID_SETTINGS, standardPrice: 'free' }, user: { id: ADMIN } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE membership_settings'), expect.anything())
  })
})

describe('perk update validation', () => {
  it('accepts a partial update with typed settings', () => {
    const result = parsePerkUpdate({ status: 'on', linkUrl: '/dashboard/guides', settings: { zoom_url: 'https://zoom.us/j/1', percent: 15, live: true, next_date: null } })
    expect(result).toEqual({
      ok: true,
      value: { status: 'on', linkUrl: '/dashboard/guides', settings: { zoom_url: 'https://zoom.us/j/1', percent: 15, live: true, next_date: null } },
    })
  })

  it.each([
    [{ title: '  ' }, 'Title is required'],
    [{ status: 'live' }, 'Choose On'],
    [{ linkUrl: 'javascript:alert(1)' }, 'Link must start'],
    [{ settings: [1, 2] }, 'Settings must be'],
    [{ settings: { 'bad key': 1 } }, 'not a valid setting name'],
    [{ settings: { nested: { a: 1 } } }, 'must be text'],
  ])('rejects %o', (body, message) => {
    const result = parsePerkUpdate(body)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain(message)
  })

  it('only allows http(s) and site-relative links', () => {
    expect(isSafeLink('https://zoom.us/j/1')).toBe(true)
    expect(isSafeLink('/dashboard')).toBe(true)
    expect(isSafeLink('//evil.com')).toBe(false)
    expect(isSafeLink('data:text/html,hi')).toBe(false)
  })

  it('saves settings as JSON and records who changed it', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{ key: 'live_qa', title: 'Q&A', description: '', status: 'on', sort_order: 20, icon: null, link_url: null, button_label: null, settings: { zoom_url: 'x' } }] } as any)
    const res = makeRes()
    await updatePerk({ params: { key: 'live_qa' }, body: { status: 'on', settings: { zoom_url: 'x' } }, user: { id: ADMIN } } as any, res)
    const [sql, params] = vi.mocked(query).mock.calls.at(-1)! as [string, unknown[]]
    expect(sql).toContain('settings = $2::jsonb')
    expect(params).toEqual(['on', JSON.stringify({ zoom_url: 'x' }), ADMIN, 'live_qa'])
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ key: 'live_qa', status: 'on' }))
  })
})

describe('grant and cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    client.query.mockImplementation((async (sql: string) => {
      if (sql.includes('FROM users WHERE id = $1 FOR UPDATE')) return { rows: [{ id: USER }] }
      if (sql.includes('MAX(ends_at)')) return { rows: [{ ends_at: new Date(Date.now() + 10 * DAY) }] }
      if (sql.includes('INSERT INTO memberships')) return { rows: [{ id: MEMBERSHIP, starts_at: new Date(), ends_at: new Date() }] }
      if (sql.includes("SET status = 'cancelled'")) return { rows: [{ user_id: USER }] }
      return { rows: [] }
    }) as any)
  })

  it('requires a note to gift', async () => {
    const res = makeRes()
    await grant({ body: { userId: USER, months: 12, note: ' ' }, user: { id: ADMIN } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('adds a gift year stacked on the current end date, never founding', async () => {
    const res = makeRes()
    await grant({ body: { userId: USER, months: 6, note: 'Paid cash' }, user: { id: ADMIN } } as any, res)
    expect(res.status).toHaveBeenCalledWith(201)
    const [sql, params] = calls(client.query, 'INSERT INTO memberships')[0] as [string, unknown[]]
    expect(sql).toContain("'gift', 0, 'paid'")
    expect((params[1] as Date).getTime()).toBeGreaterThan(Date.now() + 9 * DAY)
    expect(params.slice(3)).toEqual([ADMIN, 'Paid cash'])
  })

  it('cancels a year and recalculates member_until from what is left', async () => {
    const res = makeRes()
    await cancel({ params: { id: MEMBERSHIP }, body: { note: 'Refunded' } } as any, res)
    const recalc = calls(client.query, 'UPDATE users SET member_until = $2')[0][1] as unknown[]
    expect(recalc[0]).toBe(USER)
    expect(recalc[1]).toBeInstanceOf(Date)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ userId: USER }))
  })

  it('requires a note to cancel', async () => {
    const res = makeRes()
    await cancel({ params: { id: MEMBERSHIP }, body: {} } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(client.query).not.toHaveBeenCalled()
  })
})

describe('payment status for memberships', () => {
  it('reports pending until the membership is applied, even after the callback row exists', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('FROM wallet_transactions')) return { rows: [] }
      if (sql.includes('FROM memberships')) return { rows: [{ status: 'pending', mpesa_receipt: null }] }
      if (sql.includes('FROM payment_callbacks')) return { rows: [{ payment_status: 'paid', mpesa_receipt_number: 'R1' }] }
      return { rows: [] }
    }) as any)
    expect(await getLocalPaymentStatus('ws_CO_1')).toEqual({ payment_status: 'pending', mpesa_receipt: null, source: 'membership' })
  })

  it('reports paid once settled', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) =>
      sql.includes('FROM memberships') ? { rows: [{ status: 'paid', mpesa_receipt: 'R1' }] } : { rows: [] }) as any)
    expect(await getLocalPaymentStatus('ws_CO_1')).toMatchObject({ payment_status: 'paid', source: 'membership' })
  })
})

describe('membership reminders', () => {
  it('claims each reminder before sending, so it goes out once', async () => {
    vi.clearAllMocks()
    const claimed = new Set<string>()
    const endsAt = new Date(Date.now() + 5 * DAY)
    vi.mocked(query).mockImplementation((async (sql: string, params?: unknown[]) => {
      if (sql.includes('FROM membership_settings')) {
        return { rows: [{ standard_price: 2447, founding_price: 1997, founding_limit: 100, founding_deadline: new Date(), renewal_price: 1997, renewal_grace_days: 30, sales_open_at: new Date(), sales_paused: false }] }
      }
      if (sql.includes('DISTINCT ON (m.user_id)')) return { rows: [{ id: MEMBERSHIP, ends_at: endsAt, name: 'Jane', email: 'jane@example.com' }] }
      if (sql.includes('INSERT INTO membership_reminders')) {
        const key = `${params![0]}:${params![1]}`
        if (claimed.has(key)) return { rows: [] }
        claimed.add(key)
        return { rows: [{ membership_id: params![0] }] }
      }
      return { rows: [] }
    }) as any)

    expect(await sendMembershipReminders()).toBe(1)
    expect(await sendMembershipReminders()).toBe(0)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendEmail).mock.calls[0][0]).toMatchObject({ to: 'jane@example.com', subject: 'Your TRFC membership ends in 7 days' })
    expect([...claimed]).toEqual([`${MEMBERSHIP}:d7`])
  })
})
