import crypto from 'crypto'
import { getClient, query } from '../config/db.js'
import { config } from '../config/env.js'
import { toKenyanMsisdn } from './phone.js'

export const SHARE_LINK_HOURS = 24
export const SHARE_LINK_DEFAULT_USES = 3
export const SHARE_LINK_MAX_ALLOWED_USES = 100

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class ShareLinkError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export interface ShareLinkRedemption {
  linkId: string
  redemptionId: string
  zoneId: string | null
  expiresAt: Date
  phone: string
  email: string
}

interface RedemptionRow {
  id: string
  phone: string
  email: string
}

export function buildShareLinkUrl(code: string): string {
  return `${config.frontendUrl}/flash-sales?pass=${encodeURIComponent(code)}`
}

/** Normalizes the phone and email entered on a share link, or throws a 400 when either is invalid. */
export function normalizeRedeemContact(phone: unknown, email: unknown): { phone: string; email: string } {
  const msisdn = typeof phone === 'string' ? toKenyanMsisdn(phone) : null
  if (!msisdn) throw new ShareLinkError(400, 'Enter a valid Safaricom or Airtel phone number')
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!EMAIL_PATTERN.test(normalizedEmail)) throw new ShareLinkError(400, 'Enter a valid email address')
  return { phone: msisdn, email: normalizedEmail }
}

/** Number of people a new link allows; blank means the default, anything outside 1..max throws a 400. */
export function parseMaxUses(value: unknown): number {
  if (value === undefined || value === null || value === '') return SHARE_LINK_DEFAULT_USES
  const uses = Number(value)
  if (!Number.isInteger(uses) || uses < 1 || uses > SHARE_LINK_MAX_ALLOWED_USES) {
    throw new ShareLinkError(400, `Number of people must be a whole number from 1 to ${SHARE_LINK_MAX_ALLOWED_USES}`)
  }
  return uses
}

export type RedemptionMatch =
  | { kind: 'returning'; redemptionId: string }
  | { kind: 'conflict' }
  | { kind: 'new' }

/** Same person when both phone and email match one earlier redemption; a partial match is a conflict. */
export function classifyRedemption(existing: RedemptionRow[], phone: string, email: string): RedemptionMatch {
  const exact = existing.find((row) => row.phone === phone && row.email === email)
  if (exact) return { kind: 'returning', redemptionId: exact.id }
  if (existing.some((row) => row.phone === phone || row.email === email)) return { kind: 'conflict' }
  return { kind: 'new' }
}

export async function createShareLink(input: {
  createdBy: string | null
  zoneId: string | null
  sentTo: string | null
  maxUses: number
}): Promise<{ id: string; code: string; url: string; expiresAt: Date; maxUses: number }> {
  const code = crypto.randomBytes(9).toString('base64url')
  const result = await query(
    `INSERT INTO flash_share_links (code, created_by, zone_id, max_uses, sent_to, expires_at)
     VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '${SHARE_LINK_HOURS} hours')
     RETURNING id, code, expires_at, max_uses`,
    [code, input.createdBy, input.zoneId, input.maxUses, input.sentTo]
  )
  const row = result.rows[0]
  return {
    id: row.id,
    code: row.code,
    url: buildShareLinkUrl(row.code),
    expiresAt: new Date(row.expires_at),
    maxUses: Number(row.max_uses),
  }
}

/** Claims one of the link's uses for a new phone+email pair, or reissues access to a returning one. */
export async function redeemShareLink(input: {
  code: unknown
  phone: unknown
  email: unknown
}): Promise<ShareLinkRedemption> {
  const code = typeof input.code === 'string' ? input.code.trim() : ''
  if (!code) throw new ShareLinkError(400, 'This link is missing its access code')
  const { phone, email } = normalizeRedeemContact(input.phone, input.email)

  const client = await getClient()
  try {
    await client.query('BEGIN')

    const linkResult = await client.query(
      `SELECT id, zone_id, max_uses, use_count, expires_at,
              (revoked_at IS NULL AND expires_at > NOW()) AS is_open
       FROM flash_share_links
       WHERE code = $1
       FOR UPDATE`,
      [code]
    )
    const link = linkResult.rows[0]
    if (!link || !link.is_open) {
      throw new ShareLinkError(410, 'This flash deal link has expired')
    }

    const existing = await client.query(
      `SELECT id, phone, email FROM flash_share_redemptions
       WHERE link_id = $1 AND (phone = $2 OR email = $3)`,
      [link.id, phone, email]
    )
    const match = classifyRedemption(existing.rows, phone, email)
    if (match.kind === 'conflict') {
      throw new ShareLinkError(409, 'This link was already used with a different phone number or email')
    }

    let redemptionId: string
    if (match.kind === 'returning') {
      redemptionId = match.redemptionId
    } else {
      if (Number(link.use_count) >= Number(link.max_uses)) {
        throw new ShareLinkError(410, `This flash deal link has already been used by ${link.max_uses} people`)
      }
      const inserted = await client.query(
        `INSERT INTO flash_share_redemptions (link_id, phone, email) VALUES ($1, $2, $3) RETURNING id`,
        [link.id, phone, email]
      )
      redemptionId = inserted.rows[0].id
      await client.query('UPDATE flash_share_links SET use_count = use_count + 1 WHERE id = $1', [link.id])
    }

    await client.query('COMMIT')
    return {
      linkId: link.id,
      redemptionId,
      zoneId: link.zone_id ?? null,
      expiresAt: new Date(link.expires_at),
      phone,
      email,
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

export async function listShareLinks() {
  const result = await query(
    `SELECT
       l.id, l.code, l.max_uses, l.use_count, l.sent_to, l.expires_at, l.revoked_at, l.created_at,
       l.zone_id, r.name AS zone_name, u.name AS created_by_name,
       COALESCE((
         SELECT json_agg(json_build_object(
           'id', fr.id,
           'phone', fr.phone,
           'email', fr.email,
           'created_at', fr.created_at,
           'has_paid_order', EXISTS (
             SELECT 1 FROM orders o
             WHERE o.flash_share_redemption_id = fr.id AND o.payment_status = 'paid'
           )
         ) ORDER BY fr.created_at)
         FROM flash_share_redemptions fr
         WHERE fr.link_id = l.id
       ), '[]'::json) AS redemptions
     FROM flash_share_links l
     LEFT JOIN regions r ON r.id = l.zone_id
     LEFT JOIN users u ON u.id = l.created_by
     ORDER BY l.created_at DESC
     LIMIT 100`
  )
  return result.rows.map((row) => ({ ...row, url: buildShareLinkUrl(row.code) }))
}

export async function revokeShareLink(id: string): Promise<boolean> {
  const result = await query(
    'UPDATE flash_share_links SET revoked_at = COALESCE(revoked_at, NOW()) WHERE id = $1 RETURNING id',
    [id]
  )
  return result.rows.length > 0
}
