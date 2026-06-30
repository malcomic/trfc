import { Request, Response, NextFunction } from 'express'

const requestLog: Record<string, number[]> = {}
const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 5

export function simpleRateLimit(maxRequests = MAX_REQUESTS, windowMs = WINDOW_MS) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || 'unknown'
    const now = Date.now()
    requestLog[clientIp] = (requestLog[clientIp] || []).filter(
      (timestamp) => now - timestamp < windowMs
    )
    if (requestLog[clientIp].length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' })
    }
    requestLog[clientIp].push(now)
    next()
  }
}
