import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/env.js', () => ({
  config: {
    frontendUrl: 'https://example.com',
    contact: {
      email: 'support@example.com',
      phone: '+254 700 000000',
    },
  },
}))

import {
  buildTicketBatchEmailHTML,
  buildTicketBatchEmailText,
} from '../../utils/emailTemplates.js'

describe('ticket batch email templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseData = {
    userEmail: 'buyer@example.com',
    userName: 'Guest',
    eventTitle: 'Saturday Run',
    eventDate: '2026-08-01T07:00:00.000Z',
    eventLocation: 'Thika Road',
    pricePerTicket: 500,
    quantity: 2,
    totalPaid: 1000,
    paymentReference: 'ws_CO_mpesa_ref_abc',
    tickets: [{ ticketId: 't-1' }, { ticketId: 't-2' }],
    confirmationUrl:
      'https://example.com/ticket-confirmation/ws_CO_mpesa_ref_abc?email=buyer%40example.com',
  }

  it('includes purchase summary fields in HTML', () => {
    const html = buildTicketBatchEmailHTML(baseData)
    expect(html).toContain("You're confirmed")
    expect(html).toContain('Saturday Run')
    expect(html).toContain('Thika Road')
    expect(html).toContain('KES 1,000')
    expect(html).toContain('ws_CO_mpesa_ref_abc')
    expect(html).toContain('t-1')
    expect(html).toContain('t-2')
    expect(html).toContain(baseData.confirmationUrl)
    expect(html).toContain('support@example.com')
    expect(html).toContain('PDF attachment')
    expect(html).not.toContain('/payment-history')
  })

  it('includes the same essentials in plain text', () => {
    const text = buildTicketBatchEmailText(baseData)
    expect(text).toContain("You're confirmed")
    expect(text).toContain('Saturday Run')
    expect(text).toContain('Total paid: KES 1,000')
    expect(text).toContain('ws_CO_mpesa_ref_abc')
    expect(text).toContain(baseData.confirmationUrl)
    expect(text).toContain('support@example.com')
  })

  it('uses email local-part for guest greeting', () => {
    const html = buildTicketBatchEmailHTML(baseData)
    expect(html).toContain('Hi <strong>buyer</strong>')
  })
})
