import axios from 'axios'
import { config } from '../config/env.js'

export function isWhatsAppConfigured(): boolean {
  return Boolean(config.whatsapp.token && config.whatsapp.phoneNumberId)
}

/**
 * Sends an approved template message through the Meta WhatsApp Cloud API.
 * Messages to users who have not messaged the business first must be templates.
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  bodyParams: string[]
): Promise<boolean> {
  if (!isWhatsAppConfigured()) {
    console.warn('WhatsApp not configured (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID); skipping send')
    return false
  }

  const { token, phoneNumberId, templateLang, apiVersion } = config.whatsapp
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`

  try {
    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLang },
          components: bodyParams.length
            ? [
                {
                  type: 'body',
                  parameters: bodyParams.map((text) => ({ type: 'text', text })),
                },
              ]
            : [],
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      }
    )
    return true
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string }
    console.error('WhatsApp send failed:', err.response?.data ?? err.message ?? error)
    return false
  }
}

export function sendSignupWelcome(to: string, programName: string): Promise<boolean> {
  return sendTemplateMessage(to, config.whatsapp.templateName, [programName])
}

/** Welcome sent once after a website account is created. Template variables: first name, captain label. */
export function sendAccountWelcome(to: string, firstName: string, captainLabel: string): Promise<boolean> {
  return sendTemplateMessage(to, config.whatsapp.welcomeTemplateName, [firstName, captainLabel])
}

/**
 * Ticket payment reminder (7 days, 3 days and on the deadline day).
 * Template variables: first name, amount left to pay, event title, deadline. Skipped when no template is set.
 */
export async function sendPaymentReminder(
  to: string,
  params: { firstName: string; amount: string; eventTitle: string; dueDate: string }
): Promise<boolean> {
  if (!config.whatsapp.installmentTemplateName) return false
  return sendTemplateMessage(to, config.whatsapp.installmentTemplateName, [
    params.firstName,
    params.amount,
    params.eventTitle,
    params.dueDate,
  ])
}

/** Ticket value added. Template variables: first name, amount, last day to use it. Skipped when no template is set. */
export async function sendCreditCreated(
  to: string,
  params: { firstName: string; amount: string; lastDay: string }
): Promise<boolean> {
  if (!config.whatsapp.creditCreatedTemplateName) return false
  return sendTemplateMessage(to, config.whatsapp.creditCreatedTemplateName, [
    params.firstName,
    params.amount,
    params.lastDay,
  ])
}

/** Ticket value ending soon. Template variables: first name, amount, last day, days left. Skipped when no template is set. */
export async function sendCreditExpiring(
  to: string,
  params: { firstName: string; amount: string; lastDay: string; daysLeft: string }
): Promise<boolean> {
  if (!config.whatsapp.creditExpiringTemplateName) return false
  return sendTemplateMessage(to, config.whatsapp.creditExpiringTemplateName, [
    params.firstName,
    params.amount,
    params.lastDay,
    params.daysLeft,
  ])
}

/** A seat opened for someone on the waiting list. Template variables: first name, event title, booking link. Skipped when no template is set. */
export async function sendWaitlistSpot(
  to: string,
  params: { firstName: string; eventTitle: string; link: string }
): Promise<boolean> {
  if (!config.whatsapp.waitlistTemplateName) return false
  return sendTemplateMessage(to, config.whatsapp.waitlistTemplateName, [params.firstName, params.eventTitle, params.link])
}
