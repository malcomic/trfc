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
  buildMedalBatchEmailHTML,
  buildMedalBatchEmailText,
} from '../../utils/emailTemplates.js'

describe('medal batch email templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseData = {
    userEmail: 'buyer@example.com',
    userName: 'Jane Runner',
    tierName: 'Silver',
    distanceKm: 15,
    pricePerMedal: 3000,
    quantity: 2,
    totalPaid: 6000,
    paymentReference: 'ws_CO_medal_ref_abc',
    mpesaReceipt: 'QGH123',
    purchases: [
      { purchaseId: 'p-1', shortCode: 'ABCDEF12' },
      { purchaseId: 'p-2', shortCode: 'GHIJKL34' },
    ],
    confirmationUrl:
      'https://example.com/medal-confirmation/ws_CO_medal_ref_abc?email=buyer%40example.com',
  }

  it('includes medal summary fields in HTML', () => {
    const html = buildMedalBatchEmailHTML(baseData)
    expect(html).toContain('Medal confirmed')
    expect(html).toContain('Silver')
    expect(html).toContain('15 km')
    expect(html).toContain('KES 6,000')
    expect(html).toContain('QGH123')
    expect(html).toContain('ABCDEF12')
    expect(html).toContain(baseData.confirmationUrl)
    expect(html).toContain('PDF certificate')
    expect(html).toContain('support@example.com')
  })

  it('includes medal summary fields in text', () => {
    const text = buildMedalBatchEmailText(baseData)
    expect(text).toContain('Medal confirmed')
    expect(text).toContain('Silver')
    expect(text).toContain('15 km')
    expect(text).toContain(baseData.confirmationUrl)
    expect(text).toContain('ABCDEF12')
  })
})
