import { query } from '../config/db.js'
import { sendEmail } from './emailService.js'
import {
  FREE_ACCOUNT_WELCOME_SUBJECT,
  buildFreeAccountWelcomeEmailHTML,
  buildFreeAccountWelcomeEmailText,
} from './emailTemplates.js'

/**
 * Sends the free account welcome email once per account.
 * The send is claimed before sending so concurrent calls cannot both send, and released if it fails.
 * Never throws, so it can be fired without awaiting after registration.
 */
export async function sendWelcomeEmailOnce(userId: string): Promise<boolean> {
  try {
    const claimed = await query(
      `UPDATE users SET welcome_email_sent_at = NOW()
       WHERE id = $1 AND welcome_email_sent_at IS NULL AND email IS NOT NULL
       RETURNING name, email`,
      [userId]
    )
    const user = claimed.rows[0]
    if (!user) return false

    const data = { name: user.name }
    const result = await sendEmail({
      to: user.email,
      subject: FREE_ACCOUNT_WELCOME_SUBJECT,
      html: buildFreeAccountWelcomeEmailHTML(data),
      text: buildFreeAccountWelcomeEmailText(data),
    })
    if (!result.success) {
      await query('UPDATE users SET welcome_email_sent_at = NULL WHERE id = $1', [userId])
    }
    return result.success
  } catch (error) {
    console.error(`Welcome email failed for user ${userId}:`, error)
    return false
  }
}
