import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const emailsSend = vi.fn()
const domainsList = vi.fn()

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: emailsSend },
    domains: { list: domainsList },
  })),
}))

vi.mock('../../config/env.js', () => ({
  config: {
    email: {
      apiKey: '',
      from: '',
    },
  },
}))

describe('emailService (Resend)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
  })

  afterEach(() => {
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
  })

  it('returns a clear failure when RESEND_API_KEY is missing', async () => {
    process.env.EMAIL_FROM = 'TRFC <tickets@example.com>'
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
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it('returns a clear failure when EMAIL_FROM is missing', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    const { sendEmail } = await import('../../utils/emailService.js')

    const result = await sendEmail({
      to: 'buyer@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    })

    expect(result).toEqual({
      success: false,
      error: 'EMAIL_FROM is not configured',
    })
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it('sends via Resend and returns messageId on success', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.EMAIL_FROM = 'TRFC <tickets@example.com>'
    emailsSend.mockResolvedValueOnce({
      data: { id: 'email_123' },
      error: null,
    })

    const { sendEmail } = await import('../../utils/emailService.js')
    const result = await sendEmail({
      to: 'buyer@example.com',
      subject: 'Your TRFC ticket',
      html: '<p>Thanks</p>',
      text: 'Thanks',
    })

    expect(result).toEqual({ success: true, messageId: 'email_123' })
    expect(emailsSend).toHaveBeenCalledTimes(1)
    expect(emailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'TRFC <tickets@example.com>',
        to: ['buyer@example.com'],
        subject: 'Your TRFC ticket',
        html: '<p>Thanks</p>',
        text: 'Thanks',
      })
    )
  })

  it('base64-encodes Buffer attachments for Resend', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.EMAIL_FROM = 'TRFC <tickets@example.com>'
    emailsSend.mockResolvedValueOnce({
      data: { id: 'email_456' },
      error: null,
    })

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

    expect(emailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          {
            filename: 'ticket-1.pdf',
            content: pdf.toString('base64'),
            contentType: 'application/pdf',
          },
        ],
      })
    )
  })

  it('verifyEmailTransporter returns false when credentials are missing', async () => {
    const { verifyEmailTransporter } = await import('../../utils/emailService.js')
    await expect(verifyEmailTransporter()).resolves.toBe(false)
    expect(domainsList).not.toHaveBeenCalled()
  })

  it('verifyEmailTransporter returns true when Resend API key works', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.EMAIL_FROM = 'TRFC <tickets@example.com>'
    domainsList.mockResolvedValueOnce({ data: [], error: null })

    const { verifyEmailTransporter } = await import('../../utils/emailService.js')
    await expect(verifyEmailTransporter()).resolves.toBe(true)
    expect(domainsList).toHaveBeenCalledTimes(1)
  })
})
