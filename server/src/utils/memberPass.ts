import { randomInt } from 'crypto'
import { query } from '../config/db.js'

/** No 0/O or 1/I, so a captain can read a code out loud and type it. Matches gen_member_code() in SQL. */
export const MEMBER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const MEMBER_CODE_LENGTH = 10
const MAX_ATTEMPTS = 5

export function generateMemberCode(): string {
  let code = ''
  for (let i = 0; i < MEMBER_CODE_LENGTH; i++) {
    code += MEMBER_CODE_ALPHABET[randomInt(MEMBER_CODE_ALPHABET.length)]
  }
  return code
}

/** Uppercases and strips spaces/dashes; returns null if it cannot be a member code. */
export function normalizeMemberCode(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (cleaned.length !== MEMBER_CODE_LENGTH) return null
  for (const ch of cleaned) {
    if (!MEMBER_CODE_ALPHABET.includes(ch)) return null
  }
  return cleaned
}

export function memberQrPayload(code: string): string {
  return `member:${code}`
}

function isUniqueViolation(error: unknown) {
  return !!error && typeof error === 'object' && (error as { code?: string }).code === '23505'
}

async function setCode(userId: string, onlyIfMissing: boolean): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const result = await query(
        `UPDATE users SET member_code = $2
         WHERE id = $1 ${onlyIfMissing ? 'AND member_code IS NULL' : ''}
         RETURNING member_code`,
        [userId, generateMemberCode()]
      )
      if (result.rows[0]) return result.rows[0].member_code
      if (!onlyIfMissing) throw new Error('User not found')
      const existing = await query('SELECT member_code FROM users WHERE id = $1', [userId])
      if (existing.rows[0]?.member_code) return existing.rows[0].member_code
      throw new Error('User not found')
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
    }
  }
  throw new Error('Could not create a unique member code')
}

/** The member's code, creating one if the account has none yet. */
export async function ensureMemberCode(userId: string): Promise<string> {
  const existing = await query('SELECT member_code FROM users WHERE id = $1', [userId])
  if (!existing.rows[0]) throw new Error('User not found')
  if (existing.rows[0].member_code) return existing.rows[0].member_code
  return setCode(userId, true)
}

/** Replaces the member's code, e.g. after a screenshot of the old QR code was shared. */
export function regenerateMemberCode(userId: string): Promise<string> {
  return setCode(userId, false)
}

export interface MemberByCode {
  id: string
  name: string | null
  zone: string | null
}

export async function findMemberByCode(code: string): Promise<MemberByCode | null> {
  const normalized = normalizeMemberCode(code)
  if (!normalized) return null
  const result = await query(
    `SELECT u.id, u.name, r.name AS zone
     FROM users u
     LEFT JOIN captains c ON c.user_id = u.captain_id
     LEFT JOIN regions r ON r.id = c.region_id
     WHERE u.member_code = $1
     LIMIT 1`,
    [normalized]
  )
  return result.rows[0] ?? null
}
