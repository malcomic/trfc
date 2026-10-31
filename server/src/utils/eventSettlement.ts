import { getClient, query } from '../config/db.js'
import { sendEmail } from './emailService.js'
import {
  buildCaptainStatementEmailHTML,
  buildCaptainStatementEmailText,
  buildSettlementPayoutReminderEmailHTML,
  buildSettlementPayoutReminderEmailText,
} from './emailTemplates.js'
import { getTicketRules } from './ticketRules.js'

export class SettlementError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export interface ZoneUsage {
  regionId: string
  regionName: string
  leadCaptainId: string | null
  leadCaptainName: string | null
  usedTickets: number
}

export interface SettlementLine extends ZoneUsage {
  amount: number
}

export interface SettlementBreakdown {
  revenue: number
  costs: number
  grossProfit: number
  pct: number
  usedCount: number
  perTicketValue: number
  captainPool: number
  lines: SettlementLine[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * pct% of gross profit, divided by every used ticket, times each zone's used referral tickets.
 * A loss pays nothing; zones never pay back. Each payout is rounded to whole shillings.
 */
export function splitCaptainShare(input: {
  revenue: number
  costs: number
  pct: number
  usedCount: number
  zones: ZoneUsage[]
}): SettlementBreakdown {
  const grossProfit = round2(Math.max(0, input.revenue - input.costs))
  const perTicketValue = input.usedCount > 0 ? round2(((input.pct / 100) * grossProfit) / input.usedCount) : 0
  const lines = input.zones.map((zone) => ({
    ...zone,
    amount: Math.round(perTicketValue * zone.usedTickets),
  }))
  return {
    revenue: round2(input.revenue),
    costs: round2(input.costs),
    grossProfit,
    pct: input.pct,
    usedCount: input.usedCount,
    perTicketValue,
    captainPool: lines.reduce((sum, line) => sum + line.amount, 0),
    lines,
  }
}

async function loadEvent(eventId: string) {
  const result = await query(
    `SELECT id, title, cancelled_at, (event_date AT TIME ZONE 'Africa/Nairobi') AS starts_at FROM events WHERE id = $1`,
    [eventId]
  )
  if (result.rows.length === 0) throw new SettlementError('Event not found', 404)
  return result.rows[0] as { id: string; title: string; cancelled_at: Date | null; starts_at: Date }
}

/** Works out the share from scanned tickets and recorded costs. Nothing is saved. */
export async function computeSettlement(eventId: string): Promise<SettlementBreakdown> {
  const rules = await getTicketRules()
  const usage = await query(
    `SELECT COUNT(*)::int AS used_count,
            COALESCE(SUM(COALESCE(t.unit_price, ett.price, e.price, 0)), 0)::float AS revenue
     FROM tickets t
     JOIN events e ON e.id = t.event_id
     LEFT JOIN event_ticket_types ett ON ett.id = t.ticket_type_id
     WHERE t.event_id = $1 AND t.payment_status = 'paid' AND t.checked_in_at IS NOT NULL`,
    [eventId]
  )
  const costs = await query(`SELECT COALESCE(SUM(amount), 0)::float AS total FROM event_costs WHERE event_id = $1`, [
    eventId,
  ])
  const zones = await query(
    `SELECT r.id AS region_id, r.name AS region_name, r.lead_captain_id, lu.name AS lead_captain_name,
            COUNT(*)::int AS used_tickets
     FROM tickets t
     LEFT JOIN users u ON u.id = t.user_id
     JOIN regions r ON r.id = COALESCE(
       t.referral_region_id,
       CASE WHEN t.created_at >= COALESCE(u.referred_at, '-infinity'::timestamptz) THEN u.referred_by_region_id END
     )
     LEFT JOIN users lu ON lu.id = r.lead_captain_id
     WHERE t.event_id = $1 AND t.payment_status = 'paid' AND t.checked_in_at IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM captains own
         WHERE own.user_id = t.user_id AND own.region_id = r.id AND own.status = 'active'
       )
     GROUP BY r.id, lu.id
     ORDER BY used_tickets DESC, r.name`,
    [eventId]
  )
  return splitCaptainShare({
    revenue: Number(usage.rows[0].revenue),
    costs: Number(costs.rows[0].total),
    pct: rules.captainProfitShareEnabled ? rules.captainProfitSharePct : 0,
    usedCount: usage.rows[0].used_count,
    zones: zones.rows.map((row) => ({
      regionId: row.region_id,
      regionName: row.region_name,
      leadCaptainId: row.lead_captain_id ?? null,
      leadCaptainName: row.lead_captain_name ?? null,
      usedTickets: row.used_tickets,
    })),
  })
}

export async function getSettlement(eventId: string) {
  const event = await loadEvent(eventId)
  const saved = await query(
    `SELECT s.revenue::float AS revenue, s.costs::float AS costs, s.gross_profit::float AS gross_profit,
            s.pct::float AS pct, s.used_count, s.per_ticket_value::float AS per_ticket_value,
            s.captain_pool::float AS captain_pool, s.approved_at, au.name AS approved_by_name
     FROM event_settlements s LEFT JOIN users au ON au.id = s.approved_by
     WHERE s.event_id = $1`,
    [eventId]
  )
  const lines = saved.rows.length
    ? await query(
        `SELECT l.region_id, r.name AS region_name, cu.name AS captain_name, l.used_tickets,
                l.amount::float AS amount, cc.status AS commission_status
         FROM event_settlement_lines l
         JOIN regions r ON r.id = l.region_id
         LEFT JOIN users cu ON cu.id = l.captain_id
         LEFT JOIN captain_commissions cc ON cc.source_type = 'event_share' AND cc.source_id = l.id
         WHERE l.event_id = $1 ORDER BY l.used_tickets DESC, r.name`,
        [eventId]
      )
    : null
  const costs = await query(
    `SELECT id, label, amount::float AS amount, created_at FROM event_costs WHERE event_id = $1 ORDER BY created_at`,
    [eventId]
  )
  const rules = await getTicketRules()
  return {
    event: { id: event.id, title: event.title, starts_at: event.starts_at, cancelled: Boolean(event.cancelled_at) },
    enabled: rules.captainProfitShareEnabled,
    costs: costs.rows,
    preview: saved.rows.length ? null : await computeSettlement(eventId),
    settlement: saved.rows.length
      ? {
          ...saved.rows[0],
          lines: lines!.rows,
          payout_due: new Date(new Date(event.starts_at).getTime() + PAYOUT_DAYS * DAY_MS),
        }
      : null,
  }
}

export async function addEventCost(eventId: string, label: unknown, amount: unknown, userId: string) {
  await loadEvent(eventId)
  const text = typeof label === 'string' ? label.trim() : ''
  const value = Number(amount)
  if (!text || text.length > 150) throw new SettlementError('Enter a cost description (up to 150 characters)')
  if (!Number.isFinite(value) || value < 0) throw new SettlementError('Enter a cost amount of 0 or more')
  await assertNotSettled(eventId)
  const result = await query(
    `INSERT INTO event_costs (event_id, label, amount, created_by) VALUES ($1, $2, $3, $4)
     RETURNING id, label, amount::float AS amount, created_at`,
    [eventId, text, round2(value), userId]
  )
  return result.rows[0]
}

export async function deleteEventCost(eventId: string, costId: string) {
  await assertNotSettled(eventId)
  const result = await query('DELETE FROM event_costs WHERE id = $1 AND event_id = $2 RETURNING id', [costId, eventId])
  if (result.rows.length === 0) throw new SettlementError('Cost not found', 404)
}

async function assertNotSettled(eventId: string) {
  const settled = await query('SELECT 1 FROM event_settlements WHERE event_id = $1', [eventId])
  if (settled.rows.length) throw new SettlementError('This event is already settled', 409)
}

/** Saves the settlement and adds each zone's share as an approved commission, ready for payout. */
export async function approveSettlement(eventId: string, userId: string) {
  const event = await loadEvent(eventId)
  const rules = await getTicketRules()
  if (!rules.captainProfitShareEnabled) throw new SettlementError('The captains’ profit share is turned off')
  if (event.cancelled_at) throw new SettlementError('Cancelled events have no profit share')
  if (new Date(event.starts_at).getTime() > Date.now()) throw new SettlementError('The event has not happened yet')

  const breakdown = await computeSettlement(eventId)
  const client = await getClient()
  const statements: { name: string | null; email: string | null; line: SettlementLine }[] = []
  try {
    await client.query('BEGIN')
    const inserted = await client.query(
      `INSERT INTO event_settlements
         (event_id, revenue, costs, gross_profit, pct, used_count, per_ticket_value, captain_pool, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [
        eventId,
        breakdown.revenue,
        breakdown.costs,
        breakdown.grossProfit,
        breakdown.pct,
        breakdown.usedCount,
        breakdown.perTicketValue,
        breakdown.captainPool,
        userId,
      ]
    )
    if (inserted.rows.length === 0) throw new SettlementError('This event is already settled', 409)

    for (const line of breakdown.lines) {
      const saved = await client.query(
        `INSERT INTO event_settlement_lines (event_id, region_id, used_tickets, amount)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [eventId, line.regionId, line.usedTickets, line.amount]
      )
      if (line.amount > 0) {
        await client.query(
          `INSERT INTO captain_commissions
             (region_id, referred_user_id, source_type, source_id, match_method, base_amount, rate, amount, status, approved_at)
           VALUES ($1, NULL, 'event_share', $2, 'event', $3, 1, $3, 'approved', NOW())
           ON CONFLICT (source_type, source_id) DO NOTHING`,
          [line.regionId, saved.rows[0].id, line.amount]
        )
      }
      if (line.leadCaptainId) {
        const lead = await client.query('SELECT name, email FROM users WHERE id = $1', [line.leadCaptainId])
        statements.push({ name: lead.rows[0]?.name ?? null, email: lead.rows[0]?.email ?? null, line })
      }
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  for (const statement of statements) {
    if (!statement.email) continue
    const data = {
      name: statement.name,
      zoneName: statement.line.regionName,
      eventTitle: event.title,
      usedTickets: statement.line.usedTickets,
      perTicketValue: breakdown.perTicketValue,
      amount: statement.line.amount,
    }
    sendEmail({
      to: statement.email,
      subject: `Your profit share: ${event.title}`,
      html: buildCaptainStatementEmailHTML(data),
      text: buildCaptainStatementEmailText(data),
    }).catch((error) => console.error('Failed to send captain statement:', error))
  }
  return breakdown
}

/** Captains' shares are paid within this many days of the event. */
export const PAYOUT_DAYS = 7
/** Admins are reminded about unpaid shares this many days after the event. */
const PAYOUT_REMINDER_AFTER_DAYS = 5
const DAY_MS = 86_400_000

/**
 * Emails every admin once per settled event whose captain shares are still unpaid
 * `PAYOUT_REMINDER_AFTER_DAYS` after the event, so they are paid within `PAYOUT_DAYS`.
 */
export async function remindUnpaidSettlements(now = new Date()): Promise<number> {
  const due = await query(
    `SELECT s.event_id, e.title, (e.event_date AT TIME ZONE 'Africa/Nairobi') AS starts_at
     FROM event_settlements s JOIN events e ON e.id = s.event_id
     WHERE s.payout_reminded_at IS NULL
       AND (e.event_date AT TIME ZONE 'Africa/Nairobi') <= $1
       AND EXISTS (
         SELECT 1 FROM event_settlement_lines l
         JOIN captain_commissions cc ON cc.source_type = 'event_share' AND cc.source_id = l.id
         WHERE l.event_id = s.event_id AND cc.status = 'approved'
       )`,
    [new Date(now.getTime() - PAYOUT_REMINDER_AFTER_DAYS * DAY_MS)]
  )
  if (due.rows.length === 0) return 0
  const admins = await query(`SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL`)
  const recipients = admins.rows.map((r: { email: string }) => r.email)

  let reminded = 0
  for (const row of due.rows as { event_id: string; title: string; starts_at: Date }[]) {
    const claimed = await query(
      `UPDATE event_settlements SET payout_reminded_at = $2 WHERE event_id = $1 AND payout_reminded_at IS NULL RETURNING event_id`,
      [row.event_id, now]
    )
    if (claimed.rows.length === 0) continue
    const unpaid = await query(
      `SELECT r.name AS zone_name, lu.name AS lead_captain_name, cc.amount::float AS amount
       FROM event_settlement_lines l
       JOIN captain_commissions cc ON cc.source_type = 'event_share' AND cc.source_id = l.id
       JOIN regions r ON r.id = l.region_id
       LEFT JOIN users lu ON lu.id = r.lead_captain_id
       WHERE l.event_id = $1 AND cc.status = 'approved'
       ORDER BY cc.amount DESC`,
      [row.event_id]
    )
    const data = {
      eventTitle: row.title,
      dueDate: new Date(new Date(row.starts_at).getTime() + PAYOUT_DAYS * DAY_MS),
      unpaid: unpaid.rows.map((r: { zone_name: string; lead_captain_name: string | null; amount: number }) => ({
        zoneName: r.zone_name,
        leadCaptainName: r.lead_captain_name,
        amount: Number(r.amount),
      })),
    }
    for (const to of recipients) {
      sendEmail({
        to,
        subject: `Captain payouts due: ${row.title}`,
        html: buildSettlementPayoutReminderEmailHTML(data),
        text: buildSettlementPayoutReminderEmailText(data),
      }).catch((error) => console.error('Failed to send payout reminder:', error))
    }
    reminded++
  }
  return reminded
}
