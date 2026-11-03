import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { ensureMemberCode, memberQrPayload, regenerateMemberCode } from '../utils/memberPass.js'
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

async function passFor(userId: string, code: string) {
  const user = await query('SELECT name FROM users WHERE id = $1', [userId])
  return {
    name: user.rows[0]?.name ?? null,
    code,
    qrDataUrl: await generateTextQRCodeDataUrl(memberQrPayload(code)),
  }
}

export async function getMyPass(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    res.json(await passFor(userId, await ensureMemberCode(userId)))
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
    res.json(await passFor(userId, await regenerateMemberCode(userId)))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to make a new code' })
  }
}
