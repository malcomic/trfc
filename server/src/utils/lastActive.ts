import { query } from '../config/db.js'

export const LAST_ACTIVE_THROTTLE_MS = 15 * 60 * 1000

// Per-process memo so busy members do not cost a write on every request; the SQL guard covers other processes.
const lastTouched = new Map<string, number>()

/** Records that a member used the app. Never throws, so it is safe to call without awaiting. */
export async function touchLastActive(userId: string | undefined, now: number = Date.now()): Promise<void> {
  if (!userId) return
  const previous = lastTouched.get(userId)
  if (previous !== undefined && now - previous < LAST_ACTIVE_THROTTLE_MS) return
  lastTouched.set(userId, now)
  try {
    await query(
      `UPDATE users SET last_active_at = NOW()
       WHERE id = $1 AND (last_active_at IS NULL OR last_active_at < NOW() - INTERVAL '15 minutes')`,
      [userId]
    )
  } catch (error) {
    lastTouched.delete(userId)
    console.error(`Failed to record last active for user ${userId}:`, error)
  }
}

export function resetLastActiveCache() {
  lastTouched.clear()
}
