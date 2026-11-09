import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))
vi.mock('../../utils/captainSummary.js', () => ({ findCaptainSummary: vi.fn() }))
vi.mock('../../utils/whatsapp.js', () => ({ sendWeekCheckinToCaptain: vi.fn() }))

import { query } from '../../config/db.js'
import { findCaptainSummary } from '../../utils/captainSummary.js'
import { sendWeekCheckinToCaptain } from '../../utils/whatsapp.js'
import { notifyCaptainOfCheckin } from '../../utils/programCheckinNotify.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const captain = { name: 'Brian', zone: 'Roysambu', whatsapp: '0712345678', photo_url: null }

beforeEach(() => {
  vi.mocked(query).mockReset().mockResolvedValue({ rows: [{ name: 'Amina Wanjiru' }] } as any)
  vi.mocked(findCaptainSummary).mockReset()
  vi.mocked(sendWeekCheckinToCaptain).mockReset()
})

describe('notifyCaptainOfCheckin', () => {
  it('messages the captain and marks the check-in as notified', async () => {
    vi.mocked(findCaptainSummary).mockResolvedValue(captain)
    vi.mocked(sendWeekCheckinToCaptain).mockResolvedValue(true)
    await expect(notifyCaptainOfCheckin(USER_ID, 'foundations', 2, { feel: 'Hard' })).resolves.toBe(true)
    expect(sendWeekCheckinToCaptain).toHaveBeenCalledWith('254712345678', {
      captainName: 'Brian',
      memberName: 'Amina Wanjiru',
      week: '2',
      feeling: 'Hard',
    })
    const update = vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('UPDATE program_checkins'))
    expect(update?.[1]).toEqual([USER_ID, 'foundations', 2])
  })

  it('does nothing when the member has no captain', async () => {
    vi.mocked(findCaptainSummary).mockResolvedValue(null)
    await expect(notifyCaptainOfCheckin(USER_ID, 'foundations', 1, {})).resolves.toBe(false)
    expect(sendWeekCheckinToCaptain).not.toHaveBeenCalled()
  })

  it('does nothing when the captain has no usable number', async () => {
    vi.mocked(findCaptainSummary).mockResolvedValue({ ...captain, whatsapp: null })
    await expect(notifyCaptainOfCheckin(USER_ID, 'foundations', 1, {})).resolves.toBe(false)
    expect(sendWeekCheckinToCaptain).not.toHaveBeenCalled()
  })

  it('leaves the check-in unmarked when the message is skipped', async () => {
    vi.mocked(findCaptainSummary).mockResolvedValue(captain)
    vi.mocked(sendWeekCheckinToCaptain).mockResolvedValue(false)
    await expect(notifyCaptainOfCheckin(USER_ID, 'foundations', 1, {})).resolves.toBe(false)
    expect(vi.mocked(query).mock.calls.some(([sql]) => String(sql).includes('UPDATE program_checkins'))).toBe(false)
  })
})
