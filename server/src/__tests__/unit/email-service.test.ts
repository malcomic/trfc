import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sendMail = vi.fn()
const verify = vi.fn()

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail,
      verify,
    })),
  },
}))

vi.mock('../../config/env.js', () => ({
  config: {
    email: {
      user: '',
      pass: '',
    },
  },
}))

describe('emailService (Nodemailer)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.EMAIL_USER
    delete process.env.EMAIL_PASSWORD
    delete process.env.EMAIL_PASS
  })

  afterEach(() => {
    delete process.env.EMAIL_USER
    delete process.env.EMAIL_PASSWORD
    delete process.env.EMAIL_PASS
  })

  it('returns a clear failure when credentials are missing', async () => {
    const { sendEmail } = await import('../../utils/emailService.js')

    const result = await sendEmail({
      to: 'buyer@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    })

    expect(result).toEqual({
      success: false,
      error: 'Email service not configured',
    })
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('sends via Nodemailer and returns messageId on success', async () => {
    process.env.EMAIL_USER = 'sender@gmail.com'
    process.env.EMAIL_PASSWORD = 'app-pass'
    sendMail.mockResolvedValueOnce({ messageId: 'msg-123' })

    const { sendEmail } = await import('../../utils/emailService.js')
    const result = await sendEmail({
      to: 'buyer@example.com',
      subject: 'Your TRFC ticket',
      html: '<p>Thanks</p>',
      text: 'Thanks',
    })

    expect(result).toEqual({ success: true, messageId: 'msg-123' })
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'sender@gmail.com',
        to: 'buyer@example.com',
        subject: 'Your TRFC ticket',
        html: '<p>Thanks</p>',
        text: 'Thanks',
      })
    )
  })

  it('passes Buffer attachments through to Nodemailer', async () => {
    process.env.EMAIL_USER = 'sender@gmail.com'
    process.env.EMAIL_PASS = 'app-pass'
    sendMail.mockResolvedValueOnce({ messageId: 'msg-456' })

    const pdf = Buffer.from('fake-pdf-bytes')
    const { sendEmail } = await import('../../utils/emailService.js')
    await sendEmail({
      to: 'buyer@example.com',
      subject: 'Tickets',
      html: '<p>Attached</p>',
      attachments: [
        {
          filename: 'ticket-1.pdf',
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    })

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          {
            filename: 'ticket-1.pdf',
            content: pdf,
            contentType: 'application/pdf',
          },
        ],
      })
    )
  })

  it('verifyEmailTransporter returns false when credentials are missing', async () => {
    const { verifyEmailTransporter } = await import('../../utils/emailService.js')
    await expect(verifyEmailTransporter()).resolves.toBe(false)
    expect(verify).not.toHaveBeenCalled()
  })

  it('verifyEmailTransporter returns true when Gmail transporter verifies', async () => {
    process.env.EMAIL_USER = 'sender@gmail.com'
    process.env.EMAIL_PASSWORD = 'app-pass'
    verify.mockResolvedValueOnce(true)

    const { verifyEmailTransporter } = await import('../../utils/emailService.js')
    await expect(verifyEmailTransporter()).resolves.toBe(true)
    expect(verify).toHaveBeenCalledTimes(1)
  })
})
