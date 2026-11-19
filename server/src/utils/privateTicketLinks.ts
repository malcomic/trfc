import crypto from 'crypto'
import { config } from '../config/env.js'

/** Unguessable token for a private ticket type’s stable share link. */
export function generatePrivateToken(): string {
  return crypto.randomBytes(16).toString('base64url')
}

/** Public buyer URL for a private ticket type. */
export function buildPrivateTicketUrl(token: string): string {
  const base = config.frontendUrl.replace(/\/$/, '')
  return `${base}/t/${encodeURIComponent(token)}`
}
