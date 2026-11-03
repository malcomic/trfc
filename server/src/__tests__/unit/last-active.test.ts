import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))

import { query } from '../../config/db.js'
import { LAST_ACTIVE_THROTTLE_MS, resetLastActiveCache, touchLastActive } from '../../utils/lastActive.js'

const USER_ID = '11111111-1111-4111-8111-111111111111'

describe('touchLastActive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLastActiveCache()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
  })

  it('writes at most once per throttle window', async () => {
    const start = 1_000_000
    await touchLastActive(USER_ID, start)
    await touchLastActive(USER_ID, start + 60_000)
    expect(query).toHaveBeenCalledTimes(1)
    expect(String(vi.mocked(query).mock.calls[0][0])).toContain("last_active_at < NOW() - INTERVAL '15 minutes'")

    await touchLastActive(USER_ID, start + LAST_ACTIVE_THROTTLE_MS + 1)
    expect(query).toHaveBeenCalledTimes(2)
  })

  it('never throws when the update fails, and retries next time', async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error('db down'))
    await expect(touchLastActive(USER_ID, 5)).resolves.toBeUndefined()
    await touchLastActive(USER_ID, 6)
    expect(query).toHaveBeenCalledTimes(2)
  })

  it('ignores missing user ids', async () => {
    await touchLastActive(undefined)
    expect(query).not.toHaveBeenCalled()
  })
})
