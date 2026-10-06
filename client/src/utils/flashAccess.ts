const STORAGE_KEY = 'flashAccess'

export interface StoredFlashAccess {
  token: string
  expiresAt: string
}

export function saveFlashAccess(access: StoredFlashAccess) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(access))
  } catch {
    /* storage unavailable */
  }
}

export function clearFlashAccess() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function loadFlashAccess(): StoredFlashAccess | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredFlashAccess>
    if (!parsed.token || !parsed.expiresAt || new Date(parsed.expiresAt).getTime() <= Date.now()) {
      clearFlashAccess()
      return null
    }
    return { token: parsed.token, expiresAt: parsed.expiresAt }
  } catch {
    clearFlashAccess()
    return null
  }
}

export function formatTimeLeft(expiresAt: string | Date, now = Date.now()): string {
  const ms = new Date(expiresAt).getTime() - now
  if (ms <= 0) return 'expired'
  const totalMinutes = Math.floor(ms / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${Math.max(1, minutes)}m`
}
