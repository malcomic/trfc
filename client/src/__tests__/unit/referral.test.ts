import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildReferralLink,
  captureReferralFromUrl,
  clearReferral,
  getStoredReferral,
  normalizeReferralCode,
  storeReferral,
} from '../../utils/referral'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 9, 1)

function installMemoryStorage() {
  const store = new Map<string, string>()
  global.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  } as Storage
}

describe('referral storage', () => {
  beforeEach(() => {
    installMemoryStorage()
  })

  it('normalizes codes and rejects invalid ones', () => {
    expect(normalizeReferralCode(' nrb-jane24 ')).toBe('NRB-JANE24')
    expect(normalizeReferralCode('ab')).toBeNull()
    expect(normalizeReferralCode('<script>')).toBeNull()
    expect(normalizeReferralCode(null)).toBeNull()
  })

  it('captures ?ref= from the URL and keeps it across page loads', () => {
    expect(captureReferralFromUrl('?ref=nrb-jane24&utm=x', NOW)).toBe('NRB-JANE24')
    expect(getStoredReferral(NOW + 5 * DAY)).toBe('NRB-JANE24')
  })

  it('ignores URLs without a valid ref and keeps the existing referral', () => {
    storeReferral('MSA-ALI10', NOW)
    expect(captureReferralFromUrl('?ref=%3Cbad%3E', NOW)).toBeNull()
    expect(captureReferralFromUrl('', NOW)).toBeNull()
    expect(getStoredReferral(NOW)).toBe('MSA-ALI10')
  })

  it('lets a newer link replace the stored referral', () => {
    storeReferral('MSA-ALI10', NOW)
    captureReferralFromUrl('?ref=NRB-JANE24', NOW + DAY)
    expect(getStoredReferral(NOW + DAY)).toBe('NRB-JANE24')
  })

  it('expires after 30 days and removes the stale entry', () => {
    storeReferral('NRB-JANE24', NOW)
    expect(getStoredReferral(NOW + 30 * DAY)).toBe('NRB-JANE24')
    expect(getStoredReferral(NOW + 30 * DAY + 1)).toBeNull()
    expect(localStorage.getItem('trfc_referral')).toBeNull()
  })

  it('handles corrupted storage and clearing', () => {
    localStorage.setItem('trfc_referral', '{not json')
    expect(getStoredReferral(NOW)).toBeNull()

    storeReferral('NRB-JANE24', NOW)
    clearReferral()
    expect(getStoredReferral(NOW)).toBeNull()
  })

  it('builds shareable register links', () => {
    expect(buildReferralLink('NRB-JANE24', 'https://trfc.co.ke')).toBe('https://trfc.co.ke/register?ref=NRB-JANE24')
  })
})
