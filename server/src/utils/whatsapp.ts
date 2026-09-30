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
