import { describe, it, expect, vi } from 'vitest'
import { simpleRateLimit } from '../../middleware/simpleRateLimit.js'

function call(limiter: ReturnType<typeof simpleRateLimit>, ip = '1.2.3.4') {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any
  const next = vi.fn()
  limiter({ ip } as any, res, next)
  return { res, next }
}

describe('simpleRateLimit', () => {
  it('blocks requests over the limit', () => {
    const limiter = simpleRateLimit(2, 60_000)
    expect(call(limiter).next).toHaveBeenCalled()
    expect(call(limiter).next).toHaveBeenCalled()
    const blocked = call(limiter)
    expect(blocked.next).not.toHaveBeenCalled()
    expect(blocked.res.status).toHaveBeenCalledWith(429)
  })

  it('keeps separate counts for separate limiter instances', () => {
    const first = simpleRateLimit(1, 60_000)
    const second = simpleRateLimit(1, 60_000)
    expect(call(first).next).toHaveBeenCalled()
    expect(call(second).next).toHaveBeenCalled()
    expect(call(first).next).not.toHaveBeenCalled()
  })
})
