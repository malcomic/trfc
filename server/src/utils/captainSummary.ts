import { query } from '../config/db.js';

export interface CaptainSummary {
  name: string;
  zone: string;
}

export async function findCaptainSummary(userId: string): Promise<CaptainSummary | null> {
  const result = await query(
    `SELECT cu.name, r.name AS zone
     FROM users u
     JOIN captains c ON c.user_id = u.captain_id
     JOIN users cu ON cu.id = c.user_id
     JOIN regions r ON r.id = c.region_id
     WHERE u.id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { name: (row.name ?? '').trim().split(/\s+/)[0] || 'Captain', zone: row.zone };
}
