import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { query } from '../../config/db.js'
import {
  classifyGateSearch,
  findPaidTicketsByReceipt,
  maskEmail,
  searchTicketsForGate,
  signTicketAccessToken,
  verifyTicketAccessToken,
} from '../../utils/ticketLookup.js'
import { signFlashToken } from '../../utils/flashAccess.js'

const EVENT_ID = '11111111-1111-4111-8111-111111111111'

describe('ticketLookup', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset()
    process.env.JWT_SECRET = 'test-secret'
  })

  describe('findPaidTicketsByReceipt', () => {
    it('matches the receipt case-insensitively and keeps only rows with a matching phone', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          { id: 't-1', phone: '254712345678', checkout_request_id: 'ref-1' },
          { id: 't-2', phone: '254799999999', checkout_request_id: 'ref-2' },
        ],
      } as any)

      const rows = await findPaidTicketsByReceipt(' sjk4abcdef ', '0712345678')

      expect(vi.mocked(query).mock.calls[0][1]).toEqual(['SJK4ABCDEF'])
      expect(rows.map((r) => r.id)).toEqual(['t-1'])
    })

    it('returns nothing when the phone does not match', async () => {
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 't-1', phone: '254712345678', checkout_request_id: 'ref-1' }],
      } as any)

      expect(await findPaidTicketsByReceipt('SJK4ABCDEF', '254700000000')).toEqual([])
    })

    it('skips the query when the receipt is blank', async () => {
      expect(await findPaidTicketsByReceipt('   ', '254712345678')).toEqual([])
      expect(query).not.toHaveBeenCalled()
    })
  })

  describe('searchTicketsForGate', () => {
    it('classifies phone numbers, receipt codes, and names', () => {
      expect(classifyGateSearch('0712 345 678')).toBe('phone')
      expect(classifyGateSearch('254712345678')).toBe('phone')
      expect(classifyGateSearch('SJK4ABCDEF')).toBe('receipt')
      expect(classifyGateSearch('Jane Wanjiru')).toBe('name')
      expect(classifyGateSearch('Al')).toBeNull()
    })

    it('searches phones across stored formats and scopes to the event', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [{ id: 't-1' }] } as any)

      const rows = await searchTicketsForGate('0712345678', EVENT_ID)

      const [sql, params] = vi.mocked(query).mock.calls[0]
      expect(sql).toContain('LIMIT 10')
      expect(params).toEqual(['254712345678', '0712345678', '712345678', EVENT_ID])
      expect(rows).toHaveLength(1)
    })

    it('matches receipt-shaped terms against receipts or names', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)

      await searchTicketsForGate('Kiprotich')

      const [sql, params] = vi.mocked(query).mock.calls[0]
      expect(sql).toContain('UPPER(t.mpesa_receipt) = $1 OR t.attendee_name ILIKE $2')
      expect(params).toEqual(['KIPROTICH', '%Kiprotich%', null])
    })

    it('ignores an event filter that is not a UUID', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)

      await searchTicketsForGate('Jane Wanjiru', 'not-a-uuid')

      expect(vi.mocked(query).mock.calls[0][1]).toEqual(['%Jane Wanjiru%', null])
    })

    it('does not query for terms that are too short', async () => {
      expect(await searchTicketsForGate('ab')).toEqual([])
      expect(query).not.toHaveBeenCalled()
    })
  })

  describe('ticket access tokens', () => {
    it('round-trips the checkout reference', () => {
      const token = signTicketAccessToken('ws_CO_123')
      expect(verifyTicketAccessToken(token)).toBe('ws_CO_123')
    })

    it('rejects tampered tokens and flash tokens', () => {
      const token = signTicketAccessToken('ws_CO_123')
      expect(verifyTicketAccessToken(`${token}x`)).toBeNull()

      const flashToken = signFlashToken({
        ticketId: 't-1',
        expiresAt: new Date(Date.now() + 60_000),
        zoneId: null,
        zoneName: null,
      })
      expect(verifyTicketAccessToken(flashToken)).toBeNull()
    })
  })

  it('masks email addresses', () => {
    expect(maskEmail('jane@gmail.com')).toBe('j***@gmail.com')
    expect(maskEmail(null)).toBeNull()
  })
})
