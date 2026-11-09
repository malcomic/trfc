import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))
vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn(async () => ({ success: true, messageId: 'm1' })),
}))

import { query } from '../../config/db.js'
import { sendEmail } from '../../utils/emailService.js'
import { runAnnouncementEmailTick } from '../../jobs/announcementEmails.js'
import { EMAILS_PER_TICK, verifyUnsubscribeToken } from '../../utils/announcements.js'

const ANNOUNCEMENT_ID = '33333333-3333-4333-8333-333333333333'

const row = (n: number, kind: 'important' | 'news' = 'important') => ({
  announcement_id: ANNOUNCEMENT_ID,
  user_id: `22222222-2222-4222-8222-${String(n).padStart(12, '0')}`,
  email: `runner${n}@example.com`,
  title: 'Saturday run moves',
  body: 'See you there.',
  link_url: null,
  link_label: null,
  kind,
})

const callsMatching = (fragment: string) =>
  vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes(fragment))

function mockDb(claimed: ReturnType<typeof row>[], released = 0) {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes("SET status = 'pending'")) return { rows: [], rowCount: released }
    if (sql.includes("SET status = 'sending'")) return { rows: claimed, rowCount: claimed.length }
    return { rows: [], rowCount: 1 }
  }) as any)
}

describe('runAnnouncementEmailTick', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sendEmail).mockResolvedValue({ success: true, messageId: 'm1' })
  })

  it(`claims at most ${EMAILS_PER_TICK} rows with SKIP LOCKED`, async () => {
    mockDb([])
    await runAnnouncementEmailTick()

    const [sql, params] = callsMatching("SET status = 'sending'")[0]
    expect(String(sql)).toContain('FOR UPDATE SKIP LOCKED')
    expect(String(sql)).toContain("WHERE status = 'pending'")
    expect(params).toEqual([EMAILS_PER_TICK])
    expect(EMAILS_PER_TICK).toBe(20)
  })

  it('sends each claimed email and records it as sent', async () => {
    mockDb([row(1), row(2)])
    const result = await runAnnouncementEmailTick()

    expect(result).toMatchObject({ sent: 2, failed: 0 })
    expect(sendEmail).toHaveBeenCalledTimes(2)
    expect(vi.mocked(sendEmail).mock.calls[0][0]).toMatchObject({ to: 'runner1@example.com', subject: 'Saturday run moves' })
    const finishes = callsMatching('SET status = $3')
    expect(finishes).toHaveLength(2)
    expect(finishes[0][1]).toEqual([ANNOUNCEMENT_ID, row(1).user_id, 'sent', null])
  })

  it('records failures, including thrown errors', async () => {
    vi.mocked(sendEmail)
      .mockResolvedValueOnce({ success: false, error: 'mailbox full' })
      .mockRejectedValueOnce(new Error('smtp down'))
    mockDb([row(1), row(2)])
    const result = await runAnnouncementEmailTick()

    expect(result).toMatchObject({ sent: 0, failed: 2 })
    const finishes = callsMatching('SET status = $3').map(([, params]) => params)
    expect(finishes).toEqual([
      [ANNOUNCEMENT_ID, row(1).user_id, 'failed', 'mailbox full'],
      [ANNOUNCEMENT_ID, row(2).user_id, 'failed', 'smtp down'],
    ])
  })

  it('puts a personal unsubscribe link only in news emails', async () => {
    mockDb([row(1, 'news'), row(2, 'important')])
    await runAnnouncementEmailTick()

    const [news, important] = vi.mocked(sendEmail).mock.calls.map(([options]) => options.text)
    const token = decodeURIComponent(news.match(/unsubscribe\?token=([^\s]+)/)![1])
    expect(verifyUnsubscribeToken(token)).toBe(row(1).user_id)
    expect(important).not.toContain('unsubscribe')
  })

  it('returns rows stuck in sending to the queue', async () => {
    mockDb([], 3)
    const result = await runAnnouncementEmailTick()

    expect(result.released).toBe(3)
    const [sql, params] = callsMatching("SET status = 'pending'")[0]
    expect(String(sql)).toContain("WHERE status = 'sending'")
    expect(params).toEqual([15])
  })
})
