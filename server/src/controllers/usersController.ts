import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/db.js';
import { findCaptainSummary } from '../utils/captainSummary.js';

const USER_FIELDS = 'id, name, email, phone, role, created_at';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getAdminCount(): Promise<number> {
  const result = await query("SELECT COUNT(*)::int AS cnt FROM users WHERE role = 'admin'");
  return result.rows[0].cnt;
}

async function ensureNotLastAdmin(userId: string): Promise<boolean> {
  const current = await query('SELECT role FROM users WHERE id = $1', [userId]);
  if (current.rows[0]?.role !== 'admin') return true;
  return (await getAdminCount()) > 1;
}

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { search, role, captainId } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length})`);
    }

    if (role === 'member' || role === 'admin' || role === 'scanner' || role === 'captain') {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }

    if (captainId === 'none') {
      conditions.push('u.captain_id IS NULL');
    } else if (typeof captainId === 'string' && UUID_PATTERN.test(captainId)) {
      params.push(captainId);
      conditions.push(`u.captain_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              u.whatsapp, u.marketing_opt_in, u.welcome_whatsapp_sent_at,
              u.referred_by_captain_id, u.referred_at,
              cu.name AS referred_by_captain_name,
              r.name AS referred_by_region,
              u.captain_id,
              mcu.name AS captain_name,
              mr.name AS captain_zone,
              (u.referred_by_captain_id IS NOT NULL) AS referred
       FROM users u
       LEFT JOIN captains c ON c.user_id = u.referred_by_captain_id
       LEFT JOIN users cu ON cu.id = c.user_id
       LEFT JOIN regions r ON r.id = c.region_id
       LEFT JOIN captains mc ON mc.user_id = u.captain_id
       LEFT JOIN users mcu ON mcu.id = mc.user_id
       LEFT JOIN regions mr ON mr.id = mc.region_id
       ${where}
       ORDER BY u.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getMyDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await query(
      `SELECT id, name, email, phone, whatsapp, marketing_opt_in, role, created_at
       FROM users WHERE id = $1`,
      [userId]
    );
    if (profile.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM tickets WHERE user_id = $1 AND payment_status = 'paid') AS tickets,
         (SELECT COUNT(DISTINCT t.event_id)::int
            FROM tickets t JOIN events e ON e.id = t.event_id
            WHERE t.user_id = $1 AND t.payment_status = 'paid' AND e.event_date >= CURRENT_DATE) AS upcoming_events,
         (SELECT COUNT(*)::int FROM medal_purchases WHERE user_id = $1 AND payment_status = 'paid') AS medals,
         (SELECT COUNT(*)::int FROM orders WHERE user_id = $1 AND payment_status = 'paid') AS orders,
         (SELECT COUNT(*)::int FROM equipment_hire WHERE user_id = $1 AND payment_status = 'paid') AS equipment_hires,
         (
           (SELECT COUNT(*) FROM tickets WHERE user_id = $1 AND payment_status = 'pending') +
           (SELECT COUNT(*) FROM medal_purchases WHERE user_id = $1 AND payment_status = 'pending') +
           (SELECT COUNT(*) FROM orders WHERE user_id = $1 AND payment_status = 'pending') +
           (SELECT COUNT(*) FROM equipment_hire WHERE user_id = $1 AND payment_status = 'pending')
         )::int AS pending_payments,
         (
           (SELECT COALESCE(SUM(COALESCE(t.unit_price, ett.price, e.price)), 0)
              FROM tickets t
              JOIN events e ON e.id = t.event_id
              LEFT JOIN event_ticket_types ett ON ett.id = t.ticket_type_id
              WHERE t.user_id = $1 AND t.payment_status = 'paid') +
           (SELECT COALESCE(SUM(o.price), 0)
              FROM medal_purchases p JOIN medal_options o ON o.id = p.medal_option_id
              WHERE p.user_id = $1 AND p.payment_status = 'paid') +
           (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = $1 AND payment_status = 'paid') +
           (SELECT COALESCE(SUM(total_cost), 0) FROM equipment_hire WHERE user_id = $1 AND payment_status = 'paid')
         )::float AS total_spent,
         COALESCE((SELECT balance FROM wallets WHERE user_id = $1), 0)::float AS wallet_balance,
         (SELECT COUNT(*) FROM ticket_payment_plans WHERE user_id = $1 AND status = 'active')::int AS active_plans`,
      [userId]
    );

    const captain = await findCaptainSummary(userId);
    res.json({ profile: profile.rows[0], captain, stats: stats.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load your dashboard' });
  }
};

export type CalendarStatus = 'going' | 'reserved' | 'pending' | 'attended' | 'missed' | 'none';

export interface CalendarRow {
  event_day: string;
  paid_count: number;
  reserved_count: number;
  pending_count: number;
  checked_in: boolean;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CALENDAR_DAYS = 400;
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const dayString = (date: Date) => date.toISOString().slice(0, 10);

/** Today's date in Nairobi (UTC+3, no daylight saving) as YYYY-MM-DD. */
export function nairobiToday(now: Date = new Date()): string {
  return dayString(new Date(now.getTime() + NAIROBI_OFFSET_MS));
}

function parseDay(value: unknown): Date | null {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || dayString(date) !== value ? null : date;
}

/** The member's relationship to an event, from their ticket counts. Cancelled and failed tickets aren't counted. */
export function deriveCalendarStatus(row: CalendarRow, today: string): CalendarStatus {
  const past = row.event_day < today;
  if (Number(row.paid_count) > 0) {
    if (past) return row.checked_in ? 'attended' : 'missed';
    return 'going';
  }
  if (past) return 'none';
  if (Number(row.reserved_count) > 0) return 'reserved';
  if (Number(row.pending_count) > 0) return 'pending';
  return 'none';
}

export const getMyCalendar = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = nairobiToday();

    let from: Date | null;
    let to: Date | null;
    if (req.query.from === undefined && req.query.to === undefined) {
      const [year, month] = today.split('-').map(Number);
      from = new Date(Date.UTC(year, month - 1, 1));
      to = new Date(Date.UTC(year, month, 0));
    } else {
      from = parseDay(req.query.from);
      to = parseDay(req.query.to);
    }
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to must be dates in the format YYYY-MM-DD' });
    }
    if (to < from) return res.status(400).json({ error: '"to" must be on or after "from"' });
    if ((to.getTime() - from.getTime()) / DAY_MS + 1 > MAX_CALENDAR_DAYS) {
      return res.status(400).json({ error: `The range can be at most ${MAX_CALENDAR_DAYS} days` });
    }

    const [events, earliest] = await Promise.all([
      query(
        `SELECT e.id, e.title, e.event_date, e.location, e.image_url,
                to_char(e.event_date, 'YYYY-MM-DD') AS event_day,
                COALESCE(types.min_price, e.price)::float AS min_price,
                (COALESCE(types.type_count, 0) > 0 AND COALESCE(types.all_sold, false)) AS sold_out,
                COALESCE(mine.paid_count, 0)::int AS paid_count,
                COALESCE(mine.reserved_count, 0)::int AS reserved_count,
                COALESCE(mine.pending_count, 0)::int AS pending_count,
                COALESCE(mine.checked_in, false) AS checked_in,
                plan.remaining::float AS plan_remaining
         FROM events e
         LEFT JOIN LATERAL (
           SELECT MIN(ett.price) AS min_price, COUNT(*) AS type_count,
                  bool_and(ett.capacity IS NOT NULL AND (
                    SELECT COUNT(*) FROM tickets x
                    WHERE x.ticket_type_id = ett.id AND x.payment_status IN ('pending', 'paid', 'reserved')
                  ) >= ett.capacity) AS all_sold
           FROM event_ticket_types ett
           WHERE ett.event_id = e.id AND ett.is_active = true
         ) types ON TRUE
         LEFT JOIN LATERAL (
           SELECT COUNT(*) FILTER (WHERE t.payment_status = 'paid') AS paid_count,
                  COUNT(*) FILTER (WHERE t.payment_status = 'reserved') AS reserved_count,
                  COUNT(*) FILTER (WHERE t.payment_status = 'pending') AS pending_count,
                  bool_or(t.checked_in_at IS NOT NULL) AS checked_in
           FROM tickets t
           WHERE t.user_id = $1 AND t.event_id = e.id
             AND t.payment_status IN ('paid', 'reserved', 'pending')
         ) mine ON TRUE
         LEFT JOIN LATERAL (
           SELECT SUM(p.total_amount - p.amount_paid) AS remaining
           FROM ticket_payment_plans p
           WHERE p.user_id = $1 AND p.event_id = e.id AND p.status = 'active'
         ) plan ON TRUE
         WHERE e.is_active = true
           AND e.event_date >= $2::date
           AND e.event_date < ($3::date + 1)
         ORDER BY e.event_date ASC`,
        [userId, dayString(from), dayString(to)]
      ),
      query(
        `SELECT to_char(MIN(event_date), 'YYYY-MM-DD') AS earliest,
                to_char(MAX(event_date), 'YYYY-MM-DD') AS latest
         FROM events WHERE is_active = true`
      ),
    ]);

    res.json({
      from: dayString(from),
      to: dayString(to),
      today,
      earliest: earliest.rows[0]?.earliest ?? null,
      latest: earliest.rows[0]?.latest ?? null,
      events: events.rows.map((row) => {
        const status = deriveCalendarStatus(row, today);
        return {
          id: row.id,
          title: row.title,
          event_date: row.event_date,
          event_day: row.event_day,
          location: row.location,
          image_url: row.image_url,
          min_price: row.min_price,
          sold_out: Boolean(row.sold_out),
          is_past: row.event_day < today,
          my_status: status,
          my_ticket_count: Number(row.paid_count) + Number(row.reserved_count),
          plan_remaining: status === 'reserved' ? row.plan_remaining : null,
        };
      }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load your calendar' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role = 'member' } = req.body;

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required' });
    }

    if (!['member', 'admin', 'scanner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${USER_FIELDS}`,
      [name.trim(), email.trim().toLowerCase(), phone.trim(), passwordHash, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: 'Name, email, and phone are required' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [
      email.trim().toLowerCase(),
      id,
    ]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const result = await query(
      `UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4 RETURNING ${USER_FIELDS}`,
      [name.trim(), email.trim().toLowerCase(), phone.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['member', 'admin', 'scanner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Captains are managed from the Captains page.' });
    }

    const current = await query('SELECT role FROM users WHERE id = $1', [id]);
    if (current.rows[0]?.role === 'captain') {
      return res.status(400).json({ error: 'This user is a captain. Change their status from the Captains page.' });
    }

    if (role !== 'admin' && !(await ensureNotLastAdmin(id))) {
      return res.status(400).json({ error: 'Cannot demote the last admin user' });
    }

    const result = await query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING ${USER_FIELDS}`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2 RETURNING id',
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    if (!(await ensureNotLastAdmin(id))) {
      return res.status(400).json({ error: 'Cannot delete the last admin user' });
    }

    const existing = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const captainHistory = await query(
      'SELECT 1 FROM captain_commissions WHERE captain_id = $1 UNION ALL SELECT 1 FROM captain_payouts WHERE captain_id = $1 LIMIT 1',
      [id]
    );
    if (captainHistory.rows.length > 0) {
      return res.status(400).json({ error: 'This captain has commission history. Suspend them from the Captains page instead.' });
    }

    await query('UPDATE orders SET user_id = NULL WHERE user_id = $1', [id]);
    await query('UPDATE captain_payouts SET paid_by = NULL WHERE paid_by = $1', [id]);
    await query('UPDATE site_typography SET updated_by = NULL WHERE updated_by = $1', [id]);
    await query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
