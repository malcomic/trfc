import nodemailer from 'nodemailer'
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

let transporter: nodemailer.Transporter | null = null

function getEmailPass(): string {
  return process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || config.email.pass || ''
}

function getTransporter() {
  if (!transporter) {
    const emailUser = process.env.EMAIL_USER || config.email.user
    const emailPass = getEmailPass()

    if (!emailUser || !emailPass) {
      console.warn(
        'Email credentials not configured. Set EMAIL_USER and EMAIL_PASSWORD (or EMAIL_PASS) in .env'
      )
      return null
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    })
  }
  return transporter
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
    const emailTransporter = getTransporter()

    if (!emailTransporter) {
      return {
        success: false,
        error: 'Email service not configured',
      }
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || config.email.user || 'no-reply@trfc.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments || [],
    }

    const info = await emailTransporter.sendMail(mailOptions)

    console.log(`✅ Email sent successfully to ${options.to}`)
    console.log(`   Message ID: ${info.messageId}`)

    return {
      success: true,
      messageId: info.messageId,
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

export async function verifyEmailTransporter(): Promise<boolean> {
  try {
    const emailTransporter = getTransporter()

    if (!emailTransporter) {
      console.warn(
        '⚠️  Email transporter not configured (EMAIL_USER / EMAIL_PASSWORD or EMAIL_PASS)'
      )
      return false
    }

    await emailTransporter.verify()
    console.log('✅ Email transporter verified and ready to send')
    return true
  } catch (error: any) {
    console.error('❌ Email transporter verification failed:', error.message)
    return false
  }
}

export default { sendEmail, verifyEmailTransporter }
