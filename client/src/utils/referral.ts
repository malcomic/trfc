const STORAGE_KEY = 'trfc_referral'
const REFERRAL_TTL_MS = 30 * 24 * 60 * 60 * 1000
const CODE_PATTERN = /^[A-Z0-9-]{3,20}$/

interface StoredReferral {
  code: string
  expiresAt: number
}

export function normalizeReferralCode(code: string | null | undefined): string | null {
  if (!code) return null
  const normalized = code.trim().toUpperCase()
  return CODE_PATTERN.test(normalized) ? normalized : null
}

export function storeReferral(code: string, now = Date.now()): void {
  const normalized = normalizeReferralCode(code)
  if (!normalized) return
  const value: StoredReferral = { code: normalized, expiresAt: now + REFERRAL_TTL_MS }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}

export function captureReferralFromUrl(search: string = window.location.search, now = Date.now()): string | null {
  const code = normalizeReferralCode(new URLSearchParams(search).get('ref'))
  if (code) storeReferral(code, now)
  return code
}

export function getStoredReferral(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredReferral>
    if (typeof parsed.code !== 'string' || typeof parsed.expiresAt !== 'number' || parsed.expiresAt < now) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return normalizeReferralCode(parsed.code)
  } catch {
    return null
  }
}

export function clearReferral(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function buildReferralLink(code: string, origin: string = window.location.origin): string {
  return `${origin}/register?ref=${encodeURIComponent(code)}`
}
