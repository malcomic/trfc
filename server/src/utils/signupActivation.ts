import { query } from '../config/db.js'
import { ELITE_DAYS, PROGRAM_NAMES, isProgramId } from '../config/onboarding.js'
import { sendSignupWelcome } from './whatsapp.js'

/**
 * Marks a pending signup as paid and grants the purchased tier to its user.
 * Returns the number of signups updated (0 if it was already processed).
 */
export async function activateSignup(
  signupId: string,
  checkoutRequestId: string | null,
  mpesaReceipt: string | null
): Promise<number> {
  const result = await query(
    `UPDATE signups
     SET payment_status = 'paid',
         mpesa_receipt = COALESCE($2, mpesa_receipt),
         checkout_request_id = COALESCE($3, checkout_request_id)
     WHERE id = $1 AND payment_status = 'pending'
     RETURNING user_id, tier`,
    [signupId, mpesaReceipt, checkoutRequestId]
  )
  if (result.rows.length === 0) return 0

  const { user_id: userId, tier } = result.rows[0]
  if (userId) await grantTier(userId, tier)
  return result.rowCount || 0
}

export async function grantTier(userId: string, tier: string) {
  if (tier === 'plus') {
    await query(
      `UPDATE users
       SET access_tier = CASE WHEN access_tier = 'elite' THEN 'elite' ELSE 'plus' END,
           plus_purchased_at = COALESCE(plus_purchased_at, NOW())
       WHERE id = $1`,
      [userId]
    )
  } else if (tier === 'elite') {
    // Renewing while a pass is active extends from the current expiry, not from today
    await query(
      `UPDATE users
       SET access_tier = 'elite',
           elite_expires_at = GREATEST(COALESCE(elite_expires_at, NOW()), NOW())
             + ($2 || ' days')::interval
       WHERE id = $1`,
      [userId, String(ELITE_DAYS)]
    )
  }
}

export async function activateSignupsByCheckoutId(
  checkoutRequestId: string,
  mpesaReceipt: string | null
): Promise<number> {
  const pending = await query(
    `SELECT id FROM signups WHERE checkout_request_id = $1 AND payment_status = 'pending'`,
    [checkoutRequestId]
  )
  let count = 0
  for (const row of pending.rows) {
    count += await activateSignup(row.id, checkoutRequestId, mpesaReceipt)
  }
  return count
}

/** Sends the welcome WhatsApp once per signup; never throws. */
export async function notifySignupWelcome(signupId: string): Promise<void> {
  try {
    const result = await query(
      `SELECT s.program, s.whatsapp_sent_at, u.whatsapp, u.phone_normalized
       FROM signups s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [signupId]
    )
    const row = result.rows[0]
    if (!row || row.whatsapp_sent_at) return

    const to = row.whatsapp || row.phone_normalized
    if (!to) return

    const program: string = row.program
    const programName = isProgramId(program) ? PROGRAM_NAMES[program] : program
    const sent = await sendSignupWelcome(to, programName)
    if (sent) {
      await query('UPDATE signups SET whatsapp_sent_at = NOW() WHERE id = $1', [signupId])
    }
  } catch (error) {
    console.error(`Signup welcome WhatsApp failed for ${signupId}:`, error)
  }
}

export async function notifyPaidSignupsByCheckoutId(checkoutRequestId: string): Promise<void> {
  const result = await query(
    `SELECT id FROM signups
     WHERE checkout_request_id = $1 AND payment_status = 'paid' AND whatsapp_sent_at IS NULL`,
    [checkoutRequestId]
  )
  for (const row of result.rows) {
    void notifySignupWelcome(row.id)
  }
}
