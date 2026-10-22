import { query } from '../config/db.js'
import { sendAccountWelcome } from './whatsapp.js'

export const DEFAULT_CAPTAIN_LABEL = 'your zone captain'

function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] || 'friend'
}

/**
 * Sends the account welcome WhatsApp once, only to members who opted in to messages.
 * Never throws, so it can be fired without awaiting after registration.
 */
export async function sendAccountWelcomeOnce(userId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT u.name, u.whatsapp, u.phone_normalized, u.marketing_opt_in, u.welcome_whatsapp_sent_at,
              cu.name AS captain_name, r.name AS captain_zone
       FROM users u
       LEFT JOIN captains c ON c.user_id = u.captain_id
       LEFT JOIN users cu ON cu.id = c.user_id
       LEFT JOIN regions r ON r.id = c.region_id
       WHERE u.id = $1`,
      [userId]
    )
    const user = result.rows[0]
    if (!user || !user.marketing_opt_in || user.welcome_whatsapp_sent_at) return false

    const to = user.whatsapp || user.phone_normalized
    if (!to) return false

    const captainLabel = user.captain_name
      ? `${firstName(user.captain_name)}${user.captain_zone ? `, Team ${user.captain_zone}` : ''}`
      : DEFAULT_CAPTAIN_LABEL

    const sent = await sendAccountWelcome(to, firstName(user.name), captainLabel)
    if (sent) {
      await query('UPDATE users SET welcome_whatsapp_sent_at = NOW() WHERE id = $1', [userId])
    }
    return sent
  } catch (error) {
    console.error(`Account welcome WhatsApp failed for user ${userId}:`, error)
    return false
  }
}
