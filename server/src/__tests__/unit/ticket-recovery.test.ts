import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
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
  generateQRCodeDataUrl: vi.fn().mockResolvedValue('data:'),
  shortTicketCode: (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase(),
}))

vi.mock('../../utils/ticketPDFGenerator.js', () => ({
  generateTicketPDF: vi.fn().mockResolvedValue(Buffer.from('pdf')),
}))

import { query } from '../../config/db.js'
import { sendEmail } from '../../utils/emailService.js'
import { findTickets, updateTicketEmail } from '../../controllers/ticketsController.js'
import { resendAdminTicket } from '../../controllers/adminController.js'
import { signTicketAccessToken } from '../../utils/ticketLookup.js'

const TICKET_ID = '22222222-2222-4222-8222-222222222222'

function mockRes() {
  return { json: vi.fn(), status: vi.fn().mockReturnThis() } as any
}

function batchRow(ref: string, email: string) {
  return {
    id: TICKET_ID,
    user_id: null,
    event_id: 'e-1',
    phone: '254712345678',
    email,
    attendee_name: 'Jane Runner',
    mpesa_receipt: 'SJK4ABCDEF',
    checkout_request_id: ref,
    user_name: null,
    event_title: 'Run Club',
    event_date: '2026-08-01T07:00:00.000Z',
    location: 'Nairobi',
    price: '500',
  }
}

/** Routes queries used by resendTicketBatch / sendTicketBatchEmail to canned results. */
function mockPurchaseQueries(opts: { ref: string; email: string; guestChanges?: number; ticket?: any }) {
  let currentEmail = opts.email
  vi.mocked(query).mockImplementation(async (sql: string, params?: any[]) => {
    if (sql.includes('FROM ticket_email_changes')) {
      return { rows: [{ count: opts.guestChanges ?? 0 }] } as any
    }
    if (sql.includes('SELECT id, email, payment_status, checkout_request_id FROM tickets')) {
      return { rows: opts.ticket ? [opts.ticket] : [] } as any
    }
    if (sql.startsWith('UPDATE tickets SET email')) {
      currentEmail = params![0]
      return { rows: [] } as any
    }
    if (sql.includes('INSERT INTO ticket_email_changes')) {
      return { rows: [] } as any
    }
    if (sql.includes('LIMIT 1') && sql.includes('AS event_title') && sql.includes('checkout_request_id = $1')) {
      return { rows: [{ email: currentEmail, event_title: 'Run Club' }] } as any
    }
    if (sql.includes('WHERE t.checkout_request_id = $1 AND t.payment_status')) {
      return { rows: [batchRow(opts.ref, currentEmail)] } as any
    }
    return { rows: [] } as any
  })
}

describe('ticket recovery', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset()
    vi.mocked(sendEmail).mockClear()
    vi.mocked(sendEmail).mockResolvedValue({ success: true, messageId: 'msg-1' } as any)
    process.env.JWT_SECRET = 'test-secret'
  })

  describe('findTickets', () => {
    it('returns a generic 404 when the phone does not match the receipt', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ ...batchRow('ref-a', 'a@example.com'), phone: '254799999999' }],
      } as any)
      const res = mockRes()

      await findTickets({ body: { phone: '254712345678', mpesaReceipt: 'SJK4ABCDEF' } } as any, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        error: 'No paid tickets match that phone number and M-Pesa code',
      })
    })

    it('rejects a badly formatted phone number', async () => {
      const res = mockRes()
      await findTickets({ body: { phone: '0712', mpesaReceipt: 'SJK4ABCDEF' } } as any, res)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(query).not.toHaveBeenCalled()
    })

    it('returns the purchase summary and an access token on a match', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [batchRow('ref-b', 'jane@gmail.com'), { ...batchRow('ref-b', 'jane@gmail.com'), id: 't-2' }],
      } as any)
      const res = mockRes()

      await findTickets({ body: { phone: '254712345678', mpesaReceipt: 'sjk4abcdef' } } as any, res)

      expect(res.status).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          checkoutRequestId: 'ref-b',
          quantity: 2,
          maskedEmail: 'j***@gmail.com',
          token: expect.any(String),
        })
      )
    })
  })

  describe('updateTicketEmail', () => {
    it('rejects an invalid token', async () => {
      const res = mockRes()
      await updateTicketEmail({ body: { token: 'nope', email: 'new@example.com' } } as any, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('updates every ticket in the purchase, audits it, resends, and notifies the old address', async () => {
      mockPurchaseQueries({ ref: 'ref-c', email: 'old@example.com' })
      const res = mockRes()

      await updateTicketEmail(
        { body: { token: signTicketAccessToken('ref-c'), email: 'New@Example.com' } } as any,
        res
      )

      const sqls = vi.mocked(query).mock.calls.map(([sql, params]) => ({ sql: String(sql), params }))
      const update = sqls.find((c) => c.sql.startsWith('UPDATE tickets SET email'))
      expect(update?.sql).toContain('WHERE checkout_request_id = $2')
      expect(update?.params).toEqual(['new@example.com', 'ref-c'])
      const audit = sqls.find((c) => c.sql.includes('INSERT INTO ticket_email_changes'))
      expect(audit?.params).toEqual(['ref-c', 'old@example.com', 'new@example.com', 'guest', null])

      const recipients = vi.mocked(sendEmail).mock.calls.map(([opts]) => opts.to)
      expect(recipients).toEqual(['new@example.com', 'old@example.com'])
      expect(res.json).toHaveBeenCalledWith({ success: true, maskedEmail: 'n***@example.com' })
    })

    it('enforces the guest email change limit', async () => {
      mockPurchaseQueries({ ref: 'ref-d', email: 'old@example.com', guestChanges: 3 })
      const res = mockRes()

      await updateTicketEmail(
        { body: { token: signTicketAccessToken('ref-d'), email: 'new@example.com' } } as any,
        res
      )

      expect(res.status).toHaveBeenCalledWith(429)
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('applies the resend cooldown per purchase', async () => {
      mockPurchaseQueries({ ref: 'ref-e', email: 'old@example.com' })
      const token = signTicketAccessToken('ref-e')

      const first = mockRes()
      await updateTicketEmail({ body: { token, email: 'first@example.com' } } as any, first)
      expect(first.status).not.toHaveBeenCalled()

      const second = mockRes()
      await updateTicketEmail({ body: { token, email: 'second@example.com' } } as any, second)
      expect(second.status).toHaveBeenCalledWith(429)
    })
  })

  describe('resendAdminTicket', () => {
    it('refuses to resend unpaid tickets', async () => {
      mockPurchaseQueries({
        ref: 'ref-f',
        email: 'old@example.com',
        ticket: { id: TICKET_ID, email: 'old@example.com', payment_status: 'pending', checkout_request_id: 'ref-f' },
      })
      const res = mockRes()

      await resendAdminTicket({ params: { id: TICKET_ID }, body: {}, user: { id: 'admin-1' } } as any, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('updates the email for the whole purchase and resends the batch', async () => {
      mockPurchaseQueries({
        ref: 'ref-g',
        email: 'old@example.com',
        ticket: { id: TICKET_ID, email: 'old@example.com', payment_status: 'paid', checkout_request_id: 'ref-g' },
      })
      const res = mockRes()

      await resendAdminTicket(
        { params: { id: TICKET_ID }, body: { email: 'fixed@example.com' }, user: { id: 'admin-1' } } as any,
        res
      )

      const audit = vi
        .mocked(query)
        .mock.calls.find(([sql]) => String(sql).includes('INSERT INTO ticket_email_changes'))
      expect(audit?.[1]).toEqual(['ref-g', 'old@example.com', 'fixed@example.com', 'admin', 'admin-1'])
      expect(vi.mocked(sendEmail).mock.calls[0][0]).toEqual(
        expect.objectContaining({ to: 'fixed@example.com', attachments: expect.any(Array) })
      )
      expect(res.json).toHaveBeenCalledWith({ success: true, email: 'fixed@example.com' })
    })

    it('resends without changing anything when no email is given', async () => {
      mockPurchaseQueries({
        ref: 'ref-h',
        email: 'same@example.com',
        ticket: { id: TICKET_ID, email: 'same@example.com', payment_status: 'paid', checkout_request_id: 'ref-h' },
      })
      const res = mockRes()

      await resendAdminTicket({ params: { id: TICKET_ID }, body: {}, user: { id: 'admin-1' } } as any, res)

      const sqls = vi.mocked(query).mock.calls.map(([sql]) => String(sql))
      expect(sqls.some((s) => s.startsWith('UPDATE tickets SET email'))).toBe(false)
      expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1)
      expect(res.json).toHaveBeenCalledWith({ success: true, email: 'same@example.com' })
    })
  })
})
