import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))

vi.mock('../../config/env.js', () => ({
  config: {
    frontendUrl: 'https://example.com',
    contact: { email: 'support@example.com', phone: '+254700' },
  },
}))

vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
}))

vi.mock('../../utils/qrCodeGenerator.js', () => ({
  generateQRCodeBase64: vi.fn().mockResolvedValue('base64'),
  generateQRCodeBuffer: vi.fn().mockResolvedValue(Buffer.from('qr')),
}))

vi.mock('../../utils/ticketPDFGenerator.js', () => ({
  generateTicketPDF: vi.fn().mockResolvedValue(Buffer.from('pdf')),
}))

import { query } from '../../config/db.js'
import { sendEmail } from '../../utils/emailService.js'
import { generateTicketPDF } from '../../utils/ticketPDFGenerator.js'
import { sendTicketBatchEmail } from '../../utils/ticketEmail.js'

describe('sendTicketBatchEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends one email with a PDF attachment per ticket', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      rows: [
        {
          id: 't-1',
          user_id: null,
          event_id: 'e-1',
          phone: null,
          email: 'buyer@example.com',
          checkout_request_id: 'ref-1',
          user_name: null,
          event_title: 'Run Club',
          event_date: '2026-08-01T07:00:00.000Z',
          location: 'Nairobi',
          price: '500',
        },
        {
          id: 't-2',
          user_id: null,
          event_id: 'e-1',
          phone: null,
          email: 'buyer@example.com',
          checkout_request_id: 'ref-1',
          user_name: null,
          event_title: 'Run Club',
          event_date: '2026-08-01T07:00:00.000Z',
          location: 'Nairobi',
          price: '500',
        },
      ],
    } as any)

    await sendTicketBatchEmail('ref-1')

    expect(generateTicketPDF).toHaveBeenCalledTimes(2)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@example.com',
        subject: 'Your TRFC tickets — Run Club',
        text: expect.stringContaining('Run Club'),
        attachments: [
          expect.objectContaining({ filename: 'ticket-t-1.pdf' }),
          expect.objectContaining({ filename: 'ticket-t-2.pdf' }),
        ],
      })
    )
  })
})
