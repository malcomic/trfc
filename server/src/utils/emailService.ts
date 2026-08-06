import { Resend } from 'resend'
import { config } from '../config/env.js'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY || config.email.apiKey
  if (!apiKey) {
    console.warn(
      'Email credentials not configured. Set RESEND_API_KEY and EMAIL_FROM in .env'
    )
    return null
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || config.email.from || ''
}

/**
 * Send email with automatic retry logic (3 attempts with exponential backoff)
 */
export async function sendEmail(
  options: EmailOptions,
  retryCount = 0
): Promise<SendEmailResult> {
  const maxRetries = 3
  const baseDelay = 1000

  try {
    const client = getResendClient()
    const from = getFromAddress()

    if (!client) {
      return {
        success: false,
        error: 'Email service not configured',
      }
    }

    if (!from) {
      return {
        success: false,
        error: 'EMAIL_FROM is not configured',
      }
    }

    const { data, error } = await client.emails.send({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: (options.attachments || []).map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content.toString('base64'),
        contentType: attachment.contentType,
      })),
    })

    if (error) {
      throw new Error(error.message || 'Resend API error')
    }

    const messageId = data?.id
    console.log(`✅ Email sent successfully to ${options.to}`)
    if (messageId) {
      console.log(`   Message ID: ${messageId}`)
    }

    return {
      success: true,
      messageId,
    }
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown email error'

    if (retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount)
      const nextRetryCount = retryCount + 1

      console.warn(
        `⚠️  Email send failed (attempt ${retryCount + 1}/${maxRetries}): ${errorMessage}`
      )
      console.warn(
        `   Retrying in ${delay / 1000}s... (Attempt ${nextRetryCount})`
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
      return sendEmail(options, nextRetryCount)
    }

    console.error(
      `❌ Email failed after ${maxRetries} attempts to ${options.to}`
    )
    console.error(`   Error: ${errorMessage}`)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Startup check: ensure Resend credentials are present and the API key responds.
 */
export async function verifyEmailTransporter(): Promise<boolean> {
  try {
    const apiKey = process.env.RESEND_API_KEY || config.email.apiKey
    const from = getFromAddress()

    if (!apiKey || !from) {
      console.warn(
        '⚠️  Email not configured (RESEND_API_KEY / EMAIL_FROM)'
      )
      return false
    }

    const client = getResendClient()
    if (!client) {
      return false
    }

    const { error } = await client.domains.list()
    if (error) {
      console.error('❌ Resend API key verification failed:', error.message)
      return false
    }

    console.log('✅ Resend email client verified and ready to send')
    return true
  } catch (error: any) {
    console.error('❌ Resend email verification failed:', error.message)
    return false
  }
}

export default { sendEmail, verifyEmailTransporter }
