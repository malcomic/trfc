import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))
vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}))

import { getClient, query } from '../../config/db.js'
import { sendEmail } from '../../utils/emailService.js'
import { approveSettlement, remindUnpaidSettlements } from '../../utils/eventSettlement.js'
import { clearTicketRulesCache } from '../../utils/ticketRules.js'

const EVENT_START = new Date('2026-10-03T04:00:00Z')

beforeEach(() => {
  vi.clearAllMocks()
  clearTicketRulesCache()
})

/**
 * Thika hike: 10 used tickets worth KSh 10,000, KSh 5,000 costs. The Thika zone (captains Jane, the lead, and
 * Amina) referred 3 used tickets, Juja (captain Otieno) 2 and Ruiru, which has no active captains, 1.
 */
const ZONE_CAPTAINS: Record<string, { user_id: string; name: string; email: string; phone: string; is_lead: boolean }[]> = {
  'zone-thika': [
    { user_id: 'cap-1', name: 'Jane', email: 'cap-1@example.com', phone: '254700000001', is_lead: true },
    { user_id: 'cap-3', name: 'Amina', email: 'cap-3@example.com', phone: '254700000003', is_lead: false },
  ],
  'zone-juja': [{ user_id: 'cap-2', name: 'Otieno', email: 'cap-2@example.com', phone: '254700000002', is_lead: true }],
  'zone-ruiru': [],
}

function settlementDb(opts: { alreadySettled?: boolean } = {}) {
  vi.mocked(query).mockImplementation((async (sql: string, params: any[] = []) => {
    if (sql.includes('FROM events WHERE id = $1')) {
      return { rows: [{ id: 'ev-1', title: 'Thika Hike', cancelled_at: null, starts_at: EVENT_START }] }
    }
    if (sql.includes('AS used_count')) return { rows: [{ used_count: 10, revenue: 10000 }] }
    if (sql.includes('FROM event_costs WHERE event_id')) return { rows: [{ total: 5000 }] }
    if (sql.includes('AS used_tickets') && sql.includes('GROUP BY r.id')) {
      expect(sql).toContain('own.user_id = t.user_id AND own.region_id = r.id')
      return {
        rows: [
          { region_id: 'zone-thika', region_name: 'Thika', captain_count: 2, used_tickets: 3 },
          { region_id: 'zone-juja', region_name: 'Juja', captain_count: 1, used_tickets: 2 },
          { region_id: 'zone-ruiru', region_name: 'Ruiru', captain_count: 0, used_tickets: 1 },
        ],
      }
    }
    if (sql.includes('ORDER BY is_lead DESC')) return { rows: ZONE_CAPTAINS[params[0]] ?? [] }
    return { rows: [] }
  }) as any)

  const calls: [string, any[]][] = []
  let line = 0
  const clientQuery = vi.fn(async (sql: string, params: any[] = []) => {
    calls.push([sql, params])
    if (sql.includes('INSERT INTO event_settlements')) return { rows: opts.alreadySettled ? [] : [{ event_id: 'ev-1' }] }
    if (sql.includes('INSERT INTO event_settlement_lines')) return { rows: [{ id: `line-${++line}` }] }
    return { rows: [] }
  })
  vi.mocked(getClient).mockResolvedValue({ query: clientQuery, release: vi.fn() } as any)
  return { calls }
}

describe('approveSettlement', () => {
  it("saves the split per zone, adds each zone's share as an approved commission and emails every zone captain", async () => {
    const { calls } = settlementDb()

    const breakdown = await approveSettlement('ev-1', 'admin-1')

    // 20% of 5,000 profit = 1,000 over 10 used tickets = 100 per ticket.
    expect(breakdown).toMatchObject({ grossProfit: 5000, perTicketValue: 100, captainPool: 600 })
    const lines = calls.filter(([sql]) => sql.includes('INSERT INTO event_settlement_lines'))
    expect(lines.map(([, p]) => p)).toEqual([
      ['ev-1', 'zone-thika', 3, 300],
      ['ev-1', 'zone-juja', 2, 200],
      ['ev-1', 'zone-ruiru', 1, 100],
    ])
    const commissions = calls.filter(([sql]) => sql.includes('INSERT INTO captain_commissions'))
    expect(commissions.map(([, p]) => p)).toEqual([
      ['zone-thika', 'line-1', 300],
      ['zone-juja', 'line-2', 200],
      ['zone-ruiru', 'line-3', 100],
    ])
    expect(calls.some(([sql]) => sql === 'COMMIT')).toBe(true)
    // Thika's two captains and Juja's one get statements; Ruiru has no active captains.
    const mails = vi.mocked(sendEmail).mock.calls.map(([m]) => m as { to: string; text: string })
    expect(mails.map((m) => m.to)).toEqual(['cap-1@example.com', 'cap-3@example.com', 'cap-2@example.com'])
    expect(mails[0].text).toContain('Thika zone')
    expect(mails[0].text).toContain("shared equally by the zone's 2 captains, so your share is about KSh 150")
    expect(mails[2].text).not.toContain('shared equally')
  })

  it('refuses an event that is already settled and saves nothing', async () => {
    const { calls } = settlementDb({ alreadySettled: true })

    await expect(approveSettlement('ev-1', 'admin-1')).rejects.toMatchObject({ status: 409 })
    expect(calls.some(([sql]) => sql === 'ROLLBACK')).toBe(true)
    expect(calls.some(([sql]) => sql.includes('INSERT INTO captain_commissions'))).toBe(false)
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe('remindUnpaidSettlements', () => {
  const NOW = new Date('2026-10-08T06:00:00Z')

  function reminderDb(claimed: boolean) {
    vi.mocked(query).mockImplementation((async (sql: string, params: any[]) => {
      if (sql.includes('payout_reminded_at IS NULL') && sql.includes('EXISTS')) {
        // Only events that started at least 5 days ago are due.
        expect(params[0]).toEqual(new Date('2026-10-03T06:00:00Z'))
        return { rows: [{ event_id: 'ev-1', title: 'Thika Hike', starts_at: EVENT_START }] }
      }
      if (sql.includes("role = 'admin'")) return { rows: [{ email: 'ops@trfc.co.ke' }, { email: 'finance@trfc.co.ke' }] }
      if (sql.includes('UPDATE event_settlements SET payout_reminded_at')) {
        return { rows: claimed ? [{ event_id: 'ev-1' }] : [] }
      }
      if (sql.includes("cc.status = 'approved'") && sql.includes('zone_name')) {
        return {
          rows: [
            { zone_name: 'Thika', captain_count: 2, amount: 300 },
            { zone_name: 'Ruiru', captain_count: 0, amount: 100 },
          ],
        }
      }
      return { rows: [] }
    }) as any)
  }

  it('emails every admin once with the unpaid shares and the 7-day due date', async () => {
    reminderDb(true)

    expect(await remindUnpaidSettlements(NOW)).toBe(1)
    expect(sendEmail).toHaveBeenCalledTimes(2)
    const mail = vi.mocked(sendEmail).mock.calls[0][0] as { subject: string; text: string }
    expect(mail.subject).toBe('Captain payouts due: Thika Hike')
    expect(mail.text).toContain('Thika (split equally by 2 captains): KSh 300')
    expect(mail.text).toContain('Ruiru (no active captains): KSh 100')
    expect(mail.text).toContain('10 October 2026')
  })

  it('does not email again once the reminder was sent', async () => {
    reminderDb(false)

    expect(await remindUnpaidSettlements(NOW)).toBe(0)
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
