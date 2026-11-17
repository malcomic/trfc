import { config } from '../config/env.js'
import { sendEmail } from './emailService.js'
import {
  COACH_INVITATION_SUBJECT,
  buildCoachInvitationEmailHTML,
  buildCoachInvitationEmailText,
} from './emailTemplates.js'
import { INVITE_TTL_DAYS } from './coachInvitations.js'

export async function sendCoachInvitationEmail(input: {
  fullName: string
  email: string
  token: string
}): Promise<boolean> {
  const activateUrl = `${config.frontendUrl}/coach/activate?token=${encodeURIComponent(input.token)}`
  const result = await sendEmail({
    to: input.email,
    subject: COACH_INVITATION_SUBJECT,
    html: buildCoachInvitationEmailHTML({
      fullName: input.fullName,
      email: input.email,
      activateUrl,
      expiresInDays: INVITE_TTL_DAYS,
    }),
    text: buildCoachInvitationEmailText({
      fullName: input.fullName,
      email: input.email,
      activateUrl,
      expiresInDays: INVITE_TTL_DAYS,
    }),
  })
  return result.success
}
