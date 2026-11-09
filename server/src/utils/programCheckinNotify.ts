import { query } from '../config/db.js';
import { findCaptainSummary } from './captainSummary.js';
import { toKenyanMsisdn } from './phone.js';
import { sendWeekCheckinToCaptain } from './whatsapp.js';

/** Marks the check-in as notified only when the captain's WhatsApp message was accepted. */
export async function notifyCaptainOfCheckin(
  userId: string,
  program: string,
  week: number,
  answers: Record<string, string>
): Promise<boolean> {
  const captain = await findCaptainSummary(userId);
  const to = captain?.whatsapp ? toKenyanMsisdn(captain.whatsapp) : null;
  if (!captain || !to) return false;

  const member = await query(`SELECT name FROM users WHERE id = $1`, [userId]);
  const memberName = String(member.rows[0]?.name ?? '').trim() || 'A member';

  const sent = await sendWeekCheckinToCaptain(to, {
    captainName: captain.name,
    memberName,
    week: String(week),
    feeling: answers.feel || 'Not said',
  });
  if (sent) {
    await query(
      `UPDATE program_checkins SET captain_notified = true WHERE user_id = $1 AND program = $2 AND week = $3`,
      [userId, program, week]
    );
  }
  return sent;
}
