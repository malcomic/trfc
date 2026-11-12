import { query } from '../config/db.js'
import { deletePublicRaw, deleteVideo } from './cloudinary.js'
import { getNumberSetting } from './policies.js'

const BATCH = 100

/** Runs each statement on its own so one missing table or column never blocks the rest. */
async function runEach(statements: string[], params: unknown[], label: string) {
  for (const sql of statements) {
    try {
      await query(sql, params)
    } catch (error) {
      console.error(`Retention (${label}) statement failed:`, sql.split('\n')[0], error)
    }
  }
}

// ---------- Coach applications ----------

/** Deletes an application and its uploaded CV and video. The consent record stays, keyed only by id. */
export async function deleteCoachApplication(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM coach_applications WHERE id = $1 RETURNING video_source, video_public_id, cv_public_id',
    [id]
  )
  const row = result.rows[0]
  if (!row) return false
  if (row.video_source === 'upload' && row.video_public_id) {
    await deleteVideo(row.video_public_id).catch((error) => console.error(`Could not delete coach video ${row.video_public_id}:`, error))
  }
  if (row.cv_public_id) {
    await deletePublicRaw(row.cv_public_id).catch((error) => console.error(`Could not delete coach CV ${row.cv_public_id}:`, error))
  }
  return true
}

export async function purgeExpiredApplications(now = new Date()): Promise<number> {
  const afterMonths = await getNumberSetting('coach_file_retention_months_after')
  const due = await query(
    `SELECT id FROM coach_applications
     WHERE (hired_at IS NULL AND delete_after IS NOT NULL AND delete_after <= $1)
        OR (hired_at IS NOT NULL AND coaching_ended_at IS NOT NULL
            AND coaching_ended_at + make_interval(months => $2) <= $1)
     LIMIT ${BATCH}`,
    [now, afterMonths]
  )
  let deleted = 0
  for (const row of due.rows) {
    if (await deleteCoachApplication(row.id)) deleted++
  }
  return deleted
}

// ---------- Deleted accounts ----------

/**
 * Removes a member's personal details. Payment records stay (with contact details blanked) for the
 * payment retention period; everything that only describes the person is deleted.
 */
export async function anonymiseUser(userId: string): Promise<void> {
  await runEach(
    [
      'DELETE FROM member_answers WHERE user_id = $1',
      'DELETE FROM event_checkins WHERE user_id = $1',
      'DELETE FROM program_checkins WHERE user_id = $1',
      'DELETE FROM program_session_progress WHERE user_id = $1',
      'UPDATE program_enrollments SET quiz_answers = NULL WHERE user_id = $1',
      'DELETE FROM member_votes WHERE user_id = $1',
      'DELETE FROM captain_whatsapp_shares WHERE member_id = $1',
      'DELETE FROM announcement_reads WHERE user_id = $1',
      'DELETE FROM announcement_emails WHERE user_id = $1',
      'DELETE FROM password_reset_tokens WHERE user_id = $1',
      'DELETE FROM outreach_log WHERE user_id = $1',
      'DELETE FROM event_waitlist WHERE user_id = $1',
      "UPDATE tickets SET phone = NULL, email = NULL, attendee_name = 'Deleted member' WHERE user_id = $1",
      'UPDATE orders SET phone = NULL, email = NULL, delivery_address = NULL WHERE user_id = $1',
      'UPDATE equipment_hire SET phone = NULL WHERE user_id = $1',
      "UPDATE medal_purchases SET buyer_name = 'Deleted member', phone = NULL, email = NULL WHERE user_id = $1",
      'UPDATE memberships SET phone = NULL WHERE user_id = $1',
      `UPDATE users SET name = 'Deleted member', email = NULL, phone = '', phone_normalized = NULL, whatsapp = NULL,
         password_hash = NULL, google_id = NULL, avatar_url = NULL, marketing_opt_in = false, marketing_opt_in_at = NULL,
         captain_id = NULL, anonymised_at = NOW()
       WHERE id = $1`,
    ],
    [userId],
    `user ${userId}`
  )
}

export async function anonymiseDeletedAccounts(now = new Date()): Promise<number> {
  const graceDays = await getNumberSetting('account_delete_grace_days')
  // Runs a day before the promised limit so a missed nightly run still lands inside it.
  const waitDays = Math.max(0, graceDays - 1)
  const due = await query(
    `SELECT id FROM users
     WHERE deletion_requested_at IS NOT NULL AND anonymised_at IS NULL
       AND deletion_requested_at + make_interval(days => $2) <= $1
     LIMIT ${BATCH}`,
    [now, waitDays]
  )
  for (const row of due.rows) await anonymiseUser(row.id)
  return due.rows.length
}

// ---------- Payment records ----------

/** After the retention period, payment records lose every contact detail and their link to the person; amounts stay for totals. */
export async function anonymiseOldPaymentRecords(now = new Date()): Promise<void> {
  const months = await getNumberSetting('purchase_retention_months')
  await runEach(
    [
      `UPDATE tickets SET phone = NULL, email = NULL, attendee_name = NULL, user_id = NULL
       WHERE created_at < $1::timestamptz - make_interval(months => $2) AND (user_id IS NOT NULL OR phone IS NOT NULL OR email IS NOT NULL)`,
      `UPDATE orders SET phone = NULL, email = NULL, delivery_address = NULL, user_id = NULL
       WHERE created_at < $1::timestamptz - make_interval(months => $2) AND (user_id IS NOT NULL OR phone IS NOT NULL OR email IS NOT NULL)`,
      `UPDATE equipment_hire SET phone = NULL, user_id = NULL
       WHERE created_at < $1::timestamptz - make_interval(months => $2) AND (user_id IS NOT NULL OR phone IS NOT NULL)`,
      `UPDATE medal_purchases SET buyer_name = NULL, phone = NULL, email = NULL, user_id = NULL
       WHERE created_at < $1::timestamptz - make_interval(months => $2) AND (user_id IS NOT NULL OR phone IS NOT NULL OR email IS NOT NULL)`,
      `DELETE FROM payment_callbacks WHERE created_at < $1::timestamptz - make_interval(months => $2)`,
    ],
    [now, months],
    'payment records'
  )
}

export async function runRetention(now = new Date()) {
  const accounts = await anonymiseDeletedAccounts(now)
  const applications = await purgeExpiredApplications(now)
  await anonymiseOldPaymentRecords(now)
  return { accounts, applications }
}
