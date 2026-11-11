import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildTikTokIdentity,
  identifyTikTokUser,
  normalizeTikTokEmail,
  normalizeTikTokPhone,
  trackCompletePayment,
} from '../../utils/tiktokPixel'

const SHA256_HEX = /^[a-f0-9]{64}$/

describe('normalizeTikTokEmail', () => {
  it('trims and lowercases, rejecting blanks', () => {
    expect(normalizeTikTokEmail('  Jane@Example.COM ')).toBe('jane@example.com')
    expect(normalizeTikTokEmail('   ')).toBeNull()
    expect(normalizeTikTokEmail(null)).toBeNull()
  })
})

describe('normalizeTikTokPhone', () => {
  it('formats Kenyan numbers as E.164', () => {
    expect(normalizeTikTokPhone('0712 345 678')).toBe('+254712345678')
    expect(normalizeTikTokPhone('254712345678')).toBe('+254712345678')
  })

  it('keeps international numbers given with a plus and drops junk', () => {
    expect(normalizeTikTokPhone('+44 7700 900123')).toBe('+447700900123')
    expect(normalizeTikTokPhone('12')).toBeNull()
    expect(normalizeTikTokPhone(' ')).toBeNull()
  })
})

describe('buildTikTokIdentity', () => {
  it('hashes each field with SHA-256', async () => {
    const identity = await buildTikTokIdentity({ email: 'a@b.co', phone: '0712345678', externalId: 'u1' })
    expect(identity?.email).toMatch(SHA256_HEX)
    expect(identity?.phone_number).toMatch(SHA256_HEX)
    expect(identity?.external_id).toMatch(SHA256_HEX)
  })

  it('returns null when nothing usable is given', async () => {
    expect(await buildTikTokIdentity({ email: ' ', phone: '' })).toBeNull()
  })
})

describe('identify before track', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('sends identify before the purchase event', async () => {
    const calls: string[] = []
    window.ttq = {
      identify: vi.fn(() => calls.push('identify')),
      track: vi.fn((event: string) => calls.push(event)),
    }
    const done = identifyTikTokUser({ email: 'a@b.co', phone: '0712345678' })
    trackCompletePayment('order_1', { contents: [], value: 100 })
    await done
    await Promise.resolve()
    expect(calls).toEqual(['identify', 'CompletePayment'])
  })
})
