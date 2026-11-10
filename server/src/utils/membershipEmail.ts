import { query } from '../config/db.js'
import { sendEmail } from './emailService.js'
import {
  buildMembershipWelcomeEmailHTML,
  buildMembershipWelcomeEmailText,
  membershipWelcomeSubject,
} from './emailTemplates.js'
import { sendMembershipWelcomeWhatsApp } from './whatsapp.js'

const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || 'there'

/** Sends the "you're a member" email (and WhatsApp when a template is set). Never throws. */
export async function sendMembershipWelcome(membershipId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT m.price_type, m.amount, m.starts_at, m.ends_at, m.mpesa_receipt,
              u.name, u.email, COALESCE(u.whatsapp, u.phone_normalized) AS phone,
              EXISTS (
                SELECT 1 FROM memberships p
                WHERE p.user_id = m.user_id AND p.status = 'paid' AND p.price_type = 'founding'
              ) AS is_founding,
              EXISTS (
                SELECT 1 FROM memberships p
                WHERE p.user_id = m.user_id AND p.status = 'paid' AND p.id <> m.id
              ) AS has_earlier
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.id = $1 AND m.status = 'paid'`,
      [membershipId]
    )
    const row = result.rows[0]
    if (!row) return false
    const data = {
      name: row.name ?? null,
      startsAt: new Date(row.starts_at),
      endsAt: new Date(row.ends_at),
      amount: Number(row.amount),
      receipt: row.mpesa_receipt ?? null,
      isFounding: Boolean(row.is_founding),
      isRenewal: row.price_type === 'renewal' || Boolean(row.has_earlier),
    }
    const [email] = await Promise.all([
      row.email
        ? sendEmail({
            to: row.email,
            subject: membershipWelcomeSubject(data),
            html: buildMembershipWelcomeEmailHTML(data),
            text: buildMembershipWelcomeEmailText(data),
          }).then((r) => r.success)
        : Promise.resolve(false),
      row.phone
        ? sendMembershipWelcomeWhatsApp(row.phone, {
            firstName: firstName(row.name),
            until: data.endsAt.toLocaleDateString('en-KE', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'Africa/Nairobi',
            }),
          }).catch(() => false)
        : Promise.resolve(false),
    ])
    return email
  } catch (error) {
    console.error('Membership welcome failed:', error)
    return false
  }
}
