import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { getClient, query } from '../../config/db.js'
import {
  ShareLinkError,
  classifyRedemption,
  normalizeRedeemContact,
  parseMaxUses,
  redeemShareLink,
} from '../../utils/flashShareLinks.js'
import { resolveFlashAccess, signGuestFlashToken, verifyFlashToken } from '../../utils/flashAccess.js'

const LINK_ID = '11111111-1111-4111-8111-111111111111'
const REDEMPTION_ID = '22222222-2222-4222-8222-222222222222'

function mockClient(responses: Record<string, { rows: any[] }>) {
  const calls: string[] = []
  const client = {
    query: vi.fn(async (sql: string) => {
      calls.push(sql)
      const key = Object.keys(responses).find((k) => sql.includes(k))
      return key ? responses[key] : { rows: [] }
    }),
    release: vi.fn(),
  }
  vi.mocked(getClient).mockResolvedValue(client as any)
  return { client, calls }
}

const openLink = (useCount: number) => ({
  rows: [
    {
      id: LINK_ID,
      zone_id: null,
      max_uses: 3,
      use_count: useCount,
      expires_at: new Date(Date.now() + 3_600_000),
      is_open: true,
    },
  ],
})

describe('flash share links', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset()
    vi.mocked(getClient).mockReset()
    process.env.JWT_SECRET = 'test-secret'
  })

  describe('normalizeRedeemContact', () => {
    it('normalizes Kenyan phones and lowercases email', () => {
      expect(normalizeRedeemContact('0712 345 678', ' Jane@Gmail.com ')).toEqual({
        phone: '254712345678',
        email: 'jane@gmail.com',
      })
    })

    it('rejects invalid phone numbers and emails', () => {
      expect(() => normalizeRedeemContact('12345', 'jane@gmail.com')).toThrow(ShareLinkError)
      expect(() => normalizeRedeemContact('0712345678', 'not-an-email')).toThrow(ShareLinkError)
    })
  })

  describe('parseMaxUses', () => {
    it('defaults to 3 when left blank', () => {
      expect(parseMaxUses(undefined)).toBe(3)
      expect(parseMaxUses(null)).toBe(3)
      expect(parseMaxUses('')).toBe(3)
    })

    it('accepts whole numbers from 1 to 100', () => {
      expect(parseMaxUses(1)).toBe(1)
      expect(parseMaxUses('25')).toBe(25)
      expect(parseMaxUses(100)).toBe(100)
    })

    it('rejects values outside the range or not whole numbers', () => {
      for (const value of [0, -1, 1.5, 101, 'abc']) {
        expect(() => parseMaxUses(value)).toThrow(ShareLinkError)
      }
    })
  })

  describe('classifyRedemption', () => {
    const existing = [{ id: 'r-1', phone: '254712345678', email: 'jane@gmail.com' }]

    it('treats an exact phone and email match as the same person', () => {
      expect(classifyRedemption(existing, '254712345678', 'jane@gmail.com')).toEqual({
        kind: 'returning',
        redemptionId: 'r-1',
      })
    })

    it('rejects a partial match', () => {
      expect(classifyRedemption(existing, '254712345678', 'other@gmail.com')).toEqual({ kind: 'conflict' })
      expect(classifyRedemption(existing, '254799999999', 'jane@gmail.com')).toEqual({ kind: 'conflict' })
    })

    it('treats unseen details as a new person', () => {
      expect(classifyRedemption(existing, '254799999999', 'other@gmail.com')).toEqual({ kind: 'new' })
      expect(classifyRedemption([], '254799999999', 'other@gmail.com')).toEqual({ kind: 'new' })
    })
  })

  describe('redeemShareLink', () => {
    const input = { code: 'abc', phone: '0712345678', email: 'jane@gmail.com' }

    it('claims a use for a new person', async () => {
      const { calls } = mockClient({
        'FROM flash_share_links': openLink(1),
        'INSERT INTO flash_share_redemptions': { rows: [{ id: REDEMPTION_ID }] },
      })

      const result = await redeemShareLink(input)

      expect(result).toMatchObject({ linkId: LINK_ID, redemptionId: REDEMPTION_ID, phone: '254712345678' })
      expect(calls.some((sql) => sql.includes('use_count = use_count + 1'))).toBe(true)
      expect(calls).toContain('COMMIT')
    })

    it('reissues access to a returning person without counting a use', async () => {
      const { calls } = mockClient({
        'FROM flash_share_links': openLink(3),
        'FROM flash_share_redemptions': {
          rows: [{ id: REDEMPTION_ID, phone: '254712345678', email: 'jane@gmail.com' }],
        },
      })

      const result = await redeemShareLink(input)

      expect(result.redemptionId).toBe(REDEMPTION_ID)
      expect(calls.some((sql) => sql.includes('use_count = use_count + 1'))).toBe(false)
    })

    it('rejects a new person once all uses are taken', async () => {
      const { calls } = mockClient({ 'FROM flash_share_links': openLink(3) })

      await expect(redeemShareLink(input)).rejects.toMatchObject({ status: 410 })
      expect(calls).toContain('ROLLBACK')
    })

    it('rejects a reused phone with a different email', async () => {
      mockClient({
        'FROM flash_share_links': openLink(1),
        'FROM flash_share_redemptions': {
          rows: [{ id: REDEMPTION_ID, phone: '254712345678', email: 'other@gmail.com' }],
        },
      })

      await expect(redeemShareLink(input)).rejects.toMatchObject({ status: 409 })
    })

    it('rejects expired, revoked, or unknown links', async () => {
      mockClient({ 'FROM flash_share_links': { rows: [{ ...openLink(0).rows[0], is_open: false }] } })
      await expect(redeemShareLink(input)).rejects.toMatchObject({ status: 410 })

      mockClient({})
      await expect(redeemShareLink(input)).rejects.toMatchObject({ status: 410 })
    })
  })

  describe('guest flash tokens', () => {
    it('round-trips the link and redemption ids', () => {
      const token = signGuestFlashToken({
        linkId: LINK_ID,
        redemptionId: REDEMPTION_ID,
        expiresAt: new Date(Date.now() + 60_000),
      })
      expect(verifyFlashToken(token)).toEqual({ kind: 'guest', linkId: LINK_ID, redemptionId: REDEMPTION_ID })
    })

    it('resolves guest access with the stored phone and email', async () => {
      const token = signGuestFlashToken({
        linkId: LINK_ID,
        redemptionId: REDEMPTION_ID,
        expiresAt: new Date(Date.now() + 60_000),
      })
      vi.mocked(query).mockResolvedValueOnce({
        rows: [
          {
            phone: '254712345678',
            email: 'jane@gmail.com',
            expires_at: new Date(Date.now() + 60_000),
            zone_id: null,
            zone_name: null,
          },
        ],
      } as any)

      const access = await resolveFlashAccess({ headers: { 'x-flash-access': token }, body: {} } as any)

      expect(access?.ticketId).toBeNull()
      expect(access?.guest).toEqual({
        linkId: LINK_ID,
        redemptionId: REDEMPTION_ID,
        phone: '254712345678',
        email: 'jane@gmail.com',
      })
      const [sql, params] = vi.mocked(query).mock.calls[0]
      expect(sql).toContain('l.revoked_at IS NULL')
      expect(sql).toContain('l.expires_at > NOW()')
      expect(params).toEqual([REDEMPTION_ID, LINK_ID])
    })

    it('denies access once the link is revoked or expired', async () => {
      const token = signGuestFlashToken({
        linkId: LINK_ID,
        redemptionId: REDEMPTION_ID,
        expiresAt: new Date(Date.now() + 60_000),
      })
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)

      expect(await resolveFlashAccess({ headers: { 'x-flash-access': token }, body: {} } as any)).toBeNull()
    })
  })
})
