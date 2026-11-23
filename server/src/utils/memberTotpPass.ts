import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { query } from '../config/db.js'
import { generateTextQRCodeDataUrl } from './qrCodeGenerator.js'

export const PASS_WINDOW_SECONDS = 30

function windowIndex(atMs = Date.now()): number {
  return Math.floor(atMs / 1000 / PASS_WINDOW_SECONDS)
}

function tokenFor(secret: string, window: number): string {
  const digest = createHmac('sha256', secret).update(String(window)).digest('hex')
  return digest.slice(0, 12)
}

export function memberPassPayload(userId: string, token: string): string {
  return `memberpass:${userId}:${token}`
}

export function parseMemberPassPayload(
  raw: string
): { userId: string; token: string } | null {
  const trimmed = raw.trim()
  if (!trimmed.toLowerCase().startsWith('memberpass:')) return null
  const parts = trimmed.split(':')
  if (parts.length !== 3) return null
  const userId = parts[1]
  const token = parts[2].toLowerCase()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return null
  }
  if (!/^[0-9a-f]{12}$/.test(token)) return null
  return { userId, token }
}

export function verifyPassToken(secret: string, token: string, atMs = Date.now()): boolean {
  const current = windowIndex(atMs)
  for (const w of [current - 1, current, current + 1]) {
    const expected = tokenFor(secret, w)
    try {
      const a = Buffer.from(expected, 'hex')
      const b = Buffer.from(token, 'hex')
      if (a.length === b.length && timingSafeEqual(a, b)) return true
    } catch {
      /* length mismatch */
    }
  }
  return false
}

export async function ensureQrSecret(userId: string): Promise<string> {
  const existing = await query(`SELECT secret FROM qr_secrets WHERE user_id = $1`, [userId])
  if (existing.rows[0]?.secret) return existing.rows[0].secret
  const secret = randomBytes(32).toString('hex')
  try {
    await query(`INSERT INTO qr_secrets (user_id, secret) VALUES ($1, $2)`, [userId, secret])
    return secret
  } catch (error) {
    const again = await query(`SELECT secret FROM qr_secrets WHERE user_id = $1`, [userId])
    if (again.rows[0]?.secret) return again.rows[0].secret
    throw error
  }
}

export async function rotateQrSecret(userId: string): Promise<string> {
  const secret = randomBytes(32).toString('hex')
  await query(
    `INSERT INTO qr_secrets (user_id, secret, rotated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET secret = EXCLUDED.secret, rotated_at = NOW()`,
    [userId, secret]
  )
  return secret
}

export async function buildRotatingPass(userId: string, name: string | null) {
  const secret = await ensureQrSecret(userId)
  const now = Date.now()
  const w = windowIndex(now)
  const token = tokenFor(secret, w)
  const payload = memberPassPayload(userId, token)
  const secondsLeft = PASS_WINDOW_SECONDS - (Math.floor(now / 1000) % PASS_WINDOW_SECONDS)
  const qrDataUrl = await generateTextQRCodeDataUrl(payload)
  return {
    name,
    userId,
    payload,
    qrDataUrl,
    expiresInSeconds: secondsLeft,
    windowSeconds: PASS_WINDOW_SECONDS,
  }
}

export async function findMemberByPassToken(
  userId: string,
  token: string
): Promise<{ id: string; name: string | null; zone: string | null; paidMember: boolean } | null> {
  const secretRow = await query(`SELECT secret FROM qr_secrets WHERE user_id = $1`, [userId])
  const secret = secretRow.rows[0]?.secret
  if (!secret || !verifyPassToken(secret, token)) return null
  const result = await query(
    `SELECT u.id, u.name, r.name AS zone, COALESCE(u.member_until > NOW(), false) AS "paidMember"
     FROM users u
     LEFT JOIN captains c ON c.user_id = u.captain_id
     LEFT JOIN regions r ON r.id = COALESCE(u.referred_by_region_id, c.region_id)
     WHERE u.id = $1
     LIMIT 1`,
    [userId]
  )
  return result.rows[0] ?? null
}
