import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn(),
}))

vi.mock('../../controllers/flashSalesController.js', () => ({
  getCheapestLiveOffer: vi.fn(),
}))

vi.mock('../../utils/flashAccess.js', () => ({
  FLASH_ACCESS_HOURS: 24,
  buildFlashSalesUrl: vi.fn(),
}))

import { query } from '../../config/db.js'
import { sendEmail } from '../../utils/emailService.js'
import { getCheapestLiveOffer } from '../../controllers/flashSalesController.js'
import { buildFlashSalesUrl } from '../../utils/flashAccess.js'
import { dueFlashReminderStage, runFlashReminderTick } from '../../jobs/flashReminders.js'

const NOW = new Date('2026-10-07T12:00:00Z')
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000)

const mockQuery = vi.mocked(query)

type Row = Record<string, unknown>

/** Routes SQL to canned results: candidates, claim inserts and status updates. */
function setupDb(candidates: Row[], { claimSucceeds = true } = {}) {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  mockQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
    calls.push({ sql, params: params ?? [] })
    if (sql.includes('FROM tickets t')) return { rows: candidates } as any
    if (sql.includes('INSERT INTO flash_reminder_emails')) {
      return { rows: claimSucceeds ? [{ id: `claim-${params?.[2]}` }] : [] } as any
    }
    return { rows: [] } as any
  })
  return calls
}

const inserts = (calls: Array<{ sql: string; params: unknown[] }>) =>
  calls.filter((c) => c.sql.includes('INSERT INTO flash_reminder_emails')).map((c) => c.params)

const updates = (calls: Array<{ sql: string; params: unknown[] }>) =>
  calls.filter((c) => c.sql.includes('UPDATE flash_reminder_emails')).map((c) => c.params)

describe('dueFlashReminderStage', () => {
  it('returns the latest stage due, and nothing before 5 minutes or after 24 hours', () => {
    expect(dueFlashReminderStage(minutesAgo(4), NOW)).toBeNull()
    expect(dueFlashReminderStage(minutesAgo(5), NOW)).toBe(1)
    expect(dueFlashReminderStage(minutesAgo(12 * 60 + 4), NOW)).toBe(1)
    expect(dueFlashReminderStage(minutesAgo(12 * 60 + 5), NOW)).toBe(2)
    expect(dueFlashReminderStage(minutesAgo(23 * 60 + 5), NOW)).toBe(3)
    expect(dueFlashReminderStage(minutesAgo(24 * 60), NOW)).toBeNull()
  })
})

describe('runFlashReminderTick', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCheapestLiveOffer).mockResolvedValue({ salePrice: 1497, regularPrice: 2497 })
    vi.mocked(buildFlashSalesUrl).mockResolvedValue('https://example.com/flash-sales?access=t')
    vi.mocked(sendEmail).mockResolvedValue({ success: true, messageId: 'm1' })
  })

  it('sends nothing when no flash deal is live', async () => {
    vi.mocked(getCheapestLiveOffer).mockResolvedValue(null)
    const calls = setupDb([{ ticket_id: 't1', email: 'a@x.com', paid_at: minutesAgo(10), last_stage: 0 }])

    expect(await runFlashReminderTick(NOW)).toEqual({ sent: 0, failed: 0 })
    expect(calls).toHaveLength(0)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('sends the first email 5 minutes after payment and marks it sent', async () => {
    const calls = setupDb([{ ticket_id: 't1', email: 'a@x.com', paid_at: minutesAgo(6), last_stage: 0 }])

    expect(await runFlashReminderTick(NOW)).toEqual({ sent: 1, failed: 0 })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@x.com', subject: '2nd Edition Jersey Flash Sale Goes Away After 24hrs' })
    )
    expect(inserts(calls)).toEqual([['a@x.com', 't1', 1, 'sending']])
    expect(updates(calls)).toEqual([['claim-1', 'sent', null, expect.any(Date)]])
  })

  it('tracks reminder progress per ticket, not per email', async () => {
    const calls = setupDb([])
    await runFlashReminderTick(NOW)

    const candidateSql = calls.find((c) => c.sql.includes('FROM tickets t'))?.sql ?? ''
    expect(candidateSql).toContain('r.ticket_id = c.ticket_id')
    expect(candidateSql).not.toContain('LOWER(r.email) = c.email')
  })

  it('prefers the email entered at checkout over the linked account email', async () => {
    const calls = setupDb([])
    await runFlashReminderTick(NOW)

    const candidateSql = calls.find((c) => c.sql.includes('FROM tickets t'))?.sql ?? ''
    expect(candidateSql).toContain("COALESCE(NULLIF(TRIM(t.email), ''), u.email)")
    expect(candidateSql).not.toContain('COALESCE(u.email, t.email)')
  })

  it('does not resend a stage that was already sent', async () => {
    const calls = setupDb([{ ticket_id: 't1', email: 'a@x.com', paid_at: minutesAgo(60), last_stage: 1 }])

    expect(await runFlashReminderTick(NOW)).toEqual({ sent: 0, failed: 0 })
    expect(inserts(calls)).toHaveLength(0)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('sends only the latest due stage and marks the missed ones as skipped', async () => {
    const calls = setupDb([{ ticket_id: 't1', email: 'a@x.com', paid_at: minutesAgo(23 * 60 + 10), last_stage: 0 }])

    expect(await runFlashReminderTick(NOW)).toEqual({ sent: 1, failed: 0 })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ subject: 'FEW HRS LEFT — Ends in 1 Hour' }))
    expect(inserts(calls)).toEqual([
      ['a@x.com', 't1', 3, 'sending'],
      ['a@x.com', 't1', 1, 'skipped'],
      ['a@x.com', 't1', 2, 'skipped'],
    ])
  })

  it('sends nothing when another process already claimed the stage', async () => {
    setupDb([{ ticket_id: 't1', email: 'a@x.com', paid_at: minutesAgo(12 * 60 + 10), last_stage: 1 }], {
      claimSucceeds: false,
    })

    expect(await runFlashReminderTick(NOW)).toEqual({ sent: 0, failed: 0 })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('records a failed send without retrying', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ success: false, error: 'SMTP down' })
    const calls = setupDb([{ ticket_id: 't1', email: 'a@x.com', paid_at: minutesAgo(6), last_stage: 0 }])

    expect(await runFlashReminderTick(NOW)).toEqual({ sent: 0, failed: 1 })
    expect(updates(calls)).toEqual([['claim-1', 'failed', 'SMTP down', null]])
  })
})
