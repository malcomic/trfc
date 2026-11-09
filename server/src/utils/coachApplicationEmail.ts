import { query } from '../config/db.js'
import { sendEmail } from './emailService.js'
import { HOUR_LABELS, type HourOption } from './coachApplications.js'
import {
  COACH_APPLICATION_SUBJECT,
  buildCoachApplicationEmailHTML,
  buildCoachApplicationEmailText,
  buildCoachApplicationNoticeHTML,
  buildCoachApplicationNoticeText,
  type CoachApplicationEmailData,
} from './emailTemplates.js'

/** Email of the admin chosen in Hiring settings, or null when none is set or they are no longer an admin. */
export async function getHiringNoticeEmail(): Promise<string | null> {
  const result = await query(
    `SELECT u.email FROM hiring_settings s
     JOIN users u ON u.id = s.notify_user_id
     WHERE s.id = 1 AND u.role = 'admin' AND u.email IS NOT NULL`
  )
  return result.rows[0]?.email ?? null
}

/**
 * Sends the applicant confirmation and the team notice.
 * Never throws, so it can be fired without awaiting after the application is saved.
 */
export async function sendCoachApplicationEmails(applicationId: string): Promise<{ applicant: boolean; team: boolean }> {
  const sent = { applicant: false, team: false }
  try {
    const result = await query(
      `SELECT id, full_name, phone, email, location, social_url, can_give_3_hours, hours, video_url
       FROM coach_applications WHERE id = $1`,
      [applicationId]
    )
    const row = result.rows[0]
    if (!row) return sent

    const data: CoachApplicationEmailData = {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      location: row.location,
      socialUrl: row.social_url,
      canGive3Hours: row.can_give_3_hours,
      hoursLabel: ((row.hours ?? []) as string[]).map((h) => HOUR_LABELS[h as HourOption] ?? h).join(', '),
      videoUrl: row.video_url,
    }

    const applicant = await sendEmail({
      to: data.email,
      subject: COACH_APPLICATION_SUBJECT,
      html: buildCoachApplicationEmailHTML(data),
      text: buildCoachApplicationEmailText(data),
    })
    sent.applicant = applicant.success

    const teamEmail = await getHiringNoticeEmail()
    if (!teamEmail) {
      console.warn('Coach application saved, but no admin is chosen to get hiring emails (Admin > Hiring).')
      return sent
    }
    const team = await sendEmail({
      to: teamEmail,
      subject: `New coach application: ${data.fullName}`,
      html: buildCoachApplicationNoticeHTML(data),
      text: buildCoachApplicationNoticeText(data),
    })
    sent.team = team.success
  } catch (error) {
    console.error(`Coach application emails failed for ${applicationId}:`, error)
  }
  return sent
}
