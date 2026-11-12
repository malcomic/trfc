import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/env.js', () => ({
  config: {
    frontendUrl: 'https://example.com',
    contact: { email: 'support@example.com', phone: '+254 700 000000' },
  },
}))
vi.mock('../../utils/consents.js', async () => (await import('./helpers/consentMock.js')).consentModuleMock())
vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))
vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn(async () => ({ success: true, messageId: 'm-1' })),
}))

import { query } from '../../config/db.js'
import { sendEmail } from '../../utils/emailService.js'
import {
  buildGuestSignupUrl,
  buildMedalBatchEmailHTML,
  buildMedalBatchEmailText,
  buildOrderConfirmationEmailHTML,
  buildOrderConfirmationEmailText,
  buildTicketBatchEmailHTML,
  buildTicketBatchEmailText,
} from '../../utils/emailTemplates.js'
import { sendOrderConfirmationEmail } from '../../utils/orderEmail.js'

const SIGNUP_URL = buildGuestSignupUrl({ name: 'Jane W', email: 'jane@example.com', phone: '0712345678' })

const ticketData = {
  userEmail: 'jane@example.com',
  userName: 'Jane W',
  eventTitle: 'Saturday Run',
  eventDate: '2026-08-01T07:00:00.000Z',
  eventLocation: 'Thika Road',
  pricePerTicket: 500,
  quantity: 1,
  totalPaid: 500,
  paymentReference: 'ref-1',
  tickets: [{ ticketId: 't-1' }],
  confirmationUrl: 'https://example.com/ticket-confirmation/ref-1',
}

const medalData = {
  userEmail: 'jane@example.com',
  userName: 'Jane W',
  tierName: 'Gold',
  distanceKm: 21,
  pricePerMedal: 1500,
  quantity: 1,
  totalPaid: 1500,
  paymentReference: 'ref-2',
  purchases: [{ purchaseId: 'p-1', shortCode: 'ABC123' }],
  confirmationUrl: 'https://example.com/medal-confirmation/ref-2',
}

const orderData = {
  userEmail: 'jane@example.com',
  orderNumber: 'ABCD1234',
  orderDate: '4 Nov 2026',
  items: [{ name: 'Tee', quantity: 1, unitPrice: 1200, isFlash: false }],
  totalPaid: 1200,
  confirmationUrl: 'https://example.com/order-confirmation/o-1',
}

describe('buildGuestSignupUrl', () => {
  it('pre-fills the register page and sends the guest to the dashboard', () => {
    const url = new URL(SIGNUP_URL)
    expect(url.origin + url.pathname).toBe('https://example.com/register')
    expect(url.searchParams.get('name')).toBe('Jane W')
    expect(url.searchParams.get('email')).toBe('jane@example.com')
    expect(url.searchParams.get('phone')).toBe('0712345678')
    expect(url.searchParams.get('redirect')).toBe('/dashboard')
  })

  it('leaves out empty values and the "Guest" placeholder name', () => {
    const url = new URL(buildGuestSignupUrl({ name: 'Guest', email: 'a@b.co', phone: null }))
    expect(url.searchParams.has('name')).toBe(false)
    expect(url.searchParams.has('phone')).toBe(false)
  })
})

describe('signup section in confirmation emails', () => {
  const cases = [
    ['ticket', buildTicketBatchEmailHTML, buildTicketBatchEmailText, ticketData],
    ['medal', buildMedalBatchEmailHTML, buildMedalBatchEmailText, medalData],
    ['order', buildOrderConfirmationEmailHTML, buildOrderConfirmationEmailText, orderData],
  ] as const

  for (const [label, html, text, data] of cases) {
    it(`${label}: shown only when a signup URL is set`, () => {
      const withLink = { ...data, signupUrl: SIGNUP_URL } as any
      expect(html(withLink)).toContain('Create my account')
      expect(html(withLink)).toContain(SIGNUP_URL.replace(/&/g, '&amp;'))
      expect(text(withLink)).toContain('CREATE YOUR FREE ACCOUNT')
      expect(text(withLink)).toContain(SIGNUP_URL)

      expect(html(data as any)).not.toContain('Create my account')
      expect(text(data as any)).not.toContain('CREATE YOUR FREE ACCOUNT')
    })
  }
})

describe('sendOrderConfirmationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mockOrder(userId: string | null) {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('SET confirmation_email_sent_at = NOW()')) {
        return {
          rows: [
            {
              id: 'aaaaaaaa-0000-4000-8000-000000000000',
              user_id: userId,
              email: 'jane@example.com',
              phone: '254712345678',
              delivery_address: 'Roysambu',
              total_amount: 1200,
              mpesa_receipt: 'QX1',
              created_at: '2026-11-04T10:00:00Z',
              delivery_date: '2026-11-11',
            },
          ],
        }
      }
      if (sql.includes('FROM order_items')) {
        return { rows: [{ name: 'Tee', quantity: 1, unit_price: 1200, flash_sale_id: null }] }
      }
      return { rows: [] }
    }) as any)
  }

  it('includes the signup link for a guest order', async () => {
    mockOrder(null)
    await sendOrderConfirmationEmail('o-1')
    const { html } = vi.mocked(sendEmail).mock.calls[0][0] as any
    expect(html).toContain('Create my account')
    expect(html).toContain('email=jane%40example.com')
  })

  it('leaves the signup link out for a member order', async () => {
    mockOrder('member-1')
    await sendOrderConfirmationEmail('o-1')
    const { html } = vi.mocked(sendEmail).mock.calls[0][0] as any
    expect(html).not.toContain('Create my account')
  })
})
