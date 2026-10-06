import type { Request } from 'express'
import jwt from 'jsonwebtoken'
import { query } from '../config/db.js'
import { phonesMatch } from './phone.js'

export const FLASH_ACCESS_HOURS = 72

export interface FlashAccess {
  ticketId: string
  expiresAt: Date
}

type EligibilityFilter =
  | { userId: string }
  | { ticketId: string }
  | { checkoutRequestId: string; phone?: string; email?: string }

interface FlashTokenPayload {
  scope: 'flash'
  ticket_id: string
}

// A separate secret keeps flash tokens from being accepted as login tokens by authMiddleware.
function flashSecret(): string {
  return `${process.env.JWT_SECRET || ''}:flash-access`
}

const ELIGIBLE_SELECT = `
  SELECT id, phone, email, paid_at + INTERVAL '${FLASH_ACCESS_HOURS} hours' AS expires_at
  FROM tickets
  WHERE payment_status = 'paid'
    AND paid_at IS NOT NULL
    AND paid_at + INTERVAL '${FLASH_ACCESS_HOURS} hours' > NOW()
`

function toAccess(row: { id: string; expires_at: Date | string }): FlashAccess {
  return { ticketId: row.id, expiresAt: new Date(row.expires_at) }
}

export async function findEligibleTicket(filter: EligibilityFilter): Promise<FlashAccess | null> {
  if ('userId' in filter) {
    const result = await query(
      `${ELIGIBLE_SELECT} AND user_id = $1 ORDER BY paid_at DESC LIMIT 1`,
      [filter.userId]
    )
    return result.rows[0] ? toAccess(result.rows[0]) : null
  }

  if ('ticketId' in filter) {
    const result = await query(`${ELIGIBLE_SELECT} AND id = $1 LIMIT 1`, [filter.ticketId])
    return result.rows[0] ? toAccess(result.rows[0]) : null
  }

  const phone = filter.phone?.trim()
  const email = filter.email?.trim().toLowerCase()
  if (!filter.checkoutRequestId || (!phone && !email)) return null

  const result = await query(
    `${ELIGIBLE_SELECT} AND checkout_request_id = $1 ORDER BY paid_at DESC`,
    [filter.checkoutRequestId]
  )
  const match = result.rows.find((row) => {
    const phoneOk = phone && row.phone && phonesMatch(phone, row.phone)
    const emailOk = email && row.email && String(row.email).toLowerCase() === email
    return phoneOk || emailOk
  })
  return match ? toAccess(match) : null
}

export function signFlashToken(access: FlashAccess): string {
  const secondsLeft = Math.max(1, Math.floor((access.expiresAt.getTime() - Date.now()) / 1000))
  const payload: FlashTokenPayload = { scope: 'flash', ticket_id: access.ticketId }
  return jwt.sign(payload, flashSecret(), { expiresIn: secondsLeft })
}

function verifyFlashToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, flashSecret()) as Partial<FlashTokenPayload>
    if (decoded?.scope !== 'flash' || typeof decoded.ticket_id !== 'string') return null
    return decoded.ticket_id
  } catch {
    return null
  }
}

function readFlashToken(req: Request): string | null {
  const header = req.headers['x-flash-access']
  if (typeof header === 'string' && header.trim()) return header.trim()
  const bodyToken = (req.body as { flash_token?: unknown } | undefined)?.flash_token
  if (typeof bodyToken === 'string' && bodyToken.trim()) return bodyToken.trim()
  return null
}

/** Resolves flash access from an X-Flash-Access token / flash_token body field, or the logged-in user. */
export async function resolveFlashAccess(req: Request): Promise<FlashAccess | null> {
  const token = readFlashToken(req)
  if (token) {
    const ticketId = verifyFlashToken(token)
    if (ticketId) {
      const access = await findEligibleTicket({ ticketId })
      if (access) return access
    }
  }

  const userId = req.user?.id
  if (userId) {
    return findEligibleTicket({ userId })
  }

  return null
}
