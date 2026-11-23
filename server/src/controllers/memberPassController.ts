import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { ensureMemberCode, memberQrPayload, regenerateMemberCode } from '../utils/memberPass.js'
import { buildRotatingPass, rotateQrSecret } from '../utils/memberTotpPass.js'
import { generateTextQRCodeDataUrl } from '../utils/qrCodeGenerator.js'

const REGENERATE_WINDOW_MS = 60 * 60 * 1000
const REGENERATE_MAX = 3
const regenerations = new Map<string, number[]>()

export function allowRegenerate(userId: string, now = Date.now()): boolean {
  const recent = (regenerations.get(userId) ?? []).filter((at) => now - at < REGENERATE_WINDOW_MS)
  if (recent.length >= REGENERATE_MAX) {
    regenerations.set(userId, recent)
    return false
  }
  recent.push(now)
  regenerations.set(userId, recent)
  return true
}

/** Rotating QR for the booth, plus the stable typed code as fallback. */
export async function getMyPass(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const code = await ensureMemberCode(userId)
    const userRow = await query('SELECT name, avatar_url FROM users WHERE id = $1', [userId])
    const rotating = await buildRotatingPass(userId, userRow.rows[0]?.name ?? null)
    res.json({
      name: rotating.name,
      code,
      avatarUrl: userRow.rows[0]?.avatar_url ?? null,
      qrDataUrl: rotating.qrDataUrl,
      expiresInSeconds: rotating.expiresInSeconds,
      windowSeconds: rotating.windowSeconds,
      /** Stable fallback QR if a captain needs the typed code path. */
      stableQrDataUrl: await generateTextQRCodeDataUrl(memberQrPayload(code)),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load your member pass' })
  }
}

export async function regenerateMyPass(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    if (!allowRegenerate(userId)) {
      return res.status(429).json({ error: 'You have made a new code too many times. Try again in an hour.' })
    }
    const code = await regenerateMemberCode(userId)
    await rotateQrSecret(userId)
    const userRow = await query('SELECT name, avatar_url FROM users WHERE id = $1', [userId])
    const rotating = await buildRotatingPass(userId, userRow.rows[0]?.name ?? null)
    res.json({
      name: rotating.name,
      code,
      avatarUrl: userRow.rows[0]?.avatar_url ?? null,
      qrDataUrl: rotating.qrDataUrl,
      expiresInSeconds: rotating.expiresInSeconds,
      windowSeconds: rotating.windowSeconds,
      stableQrDataUrl: await generateTextQRCodeDataUrl(memberQrPayload(code)),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to make a new code' })
  }
}
