import { query } from '../config/db.js'

/** Never included in a download: secrets and internal hashes. */
const SECRET_COLUMNS = new Set(['password_hash', 'google_id', 'ip_hash', 'token', 'token_hash', 'password_changed_at'])

function clean(rows: Record<string, unknown>[]) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !SECRET_COLUMNS.has(key))))
}

/** Each section is one query keyed on the member; a failing section is reported rather than failing the whole file. */
const SECTIONS: { key: string; sql: string }[] = [
  { key: 'account', sql: 'SELECT * FROM users WHERE id = $1' },
  { key: 'answers', sql: 'SELECT * FROM member_answers WHERE user_id = $1' },
  {
    key: 'saturdays',
    sql: `SELECT DISTINCT e.event_date::date AS saturday, e.title
          FROM events e
          WHERE EXTRACT(DOW FROM e.event_date) = 6 AND e.cancelled_at IS NULL
            AND e.id IN (
              SELECT event_id FROM event_checkins WHERE user_id = $1
              UNION
              SELECT event_id FROM tickets WHERE user_id = $1 AND checked_in_at IS NOT NULL
            )
          ORDER BY saturday DESC`,
  },
  { key: 'program_enrollments', sql: 'SELECT * FROM program_enrollments WHERE user_id = $1' },
  { key: 'program_progress', sql: 'SELECT * FROM program_session_progress WHERE user_id = $1 ORDER BY program, week, day' },
  { key: 'program_checkins', sql: 'SELECT * FROM program_checkins WHERE user_id = $1 ORDER BY program, week' },
  {
    key: 'tickets',
    sql: `SELECT t.*, e.title AS event_title, e.event_date
          FROM tickets t LEFT JOIN events e ON e.id = t.event_id
          WHERE t.user_id = $1 ORDER BY t.created_at DESC`,
  },
  { key: 'ticket_cancellations', sql: 'SELECT * FROM ticket_cancellations WHERE user_id = $1' },
  { key: 'ticket_payment_plans', sql: 'SELECT * FROM ticket_payment_plans WHERE user_id = $1' },
  {
    key: 'orders',
    sql: `SELECT o.*, COALESCE(
            (SELECT json_agg(oi) FROM order_items oi WHERE oi.order_id = o.id), '[]'::json) AS items
          FROM orders o WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
  },
  { key: 'equipment_hire', sql: 'SELECT * FROM equipment_hire WHERE user_id = $1' },
  { key: 'medal_purchases', sql: 'SELECT * FROM medal_purchases WHERE user_id = $1' },
  { key: 'memberships', sql: 'SELECT * FROM memberships WHERE user_id = $1' },
  { key: 'wallet', sql: 'SELECT * FROM wallets WHERE user_id = $1' },
  { key: 'wallet_transactions', sql: 'SELECT * FROM wallet_transactions WHERE user_id = $1' },
  { key: 'ticket_credits', sql: 'SELECT * FROM ticket_credits WHERE user_id = $1' },
  { key: 'event_waitlist', sql: 'SELECT * FROM event_waitlist WHERE user_id = $1' },
  { key: 'votes', sql: 'SELECT * FROM member_votes WHERE user_id = $1' },
  {
    key: 'whatsapp_sharing',
    sql: `SELECT cu.name AS captain_name, s.enabled, s.updated_at
          FROM captain_whatsapp_shares s JOIN users cu ON cu.id = s.captain_id
          WHERE s.member_id = $1`,
  },
  {
    key: 'consents',
    sql: `SELECT consent_type, granted, policy_slug, policy_version, source, created_at
          FROM consent_records WHERE user_id = $1 ORDER BY created_at`,
  },
]

export async function buildMemberExport(userId: string) {
  const data: Record<string, unknown> = {
    generated_at: new Date().toISOString(),
    about: 'Everything Thika Road Fitness Community holds about you in the TRFC web app.',
  }
  const unavailable: string[] = []
  for (const section of SECTIONS) {
    try {
      const result = await query(section.sql, [userId])
      data[section.key] = section.key === 'account' || section.key === 'answers' || section.key === 'wallet'
        ? clean(result.rows)[0] ?? null
        : clean(result.rows)
    } catch (error) {
      console.error(`Member export: section ${section.key} failed for ${userId}:`, error)
      unavailable.push(section.key)
    }
  }
  if (unavailable.length) data.unavailable_sections = unavailable
  return data
}
