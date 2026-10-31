import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))
vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}))
vi.mock('../../utils/whatsapp.js', () => ({
  sendWaitlistSpot: vi.fn().mockResolvedValue(true),
}))
vi.mock('../../utils/seatPriority.js', () => ({
  loadSeatState: vi.fn(),
}))

import { query } from '../../config/db.js'
import { sendEmail } from '../../utils/emailService.js'
import { sendWaitlistSpot } from '../../utils/whatsapp.js'
import { loadSeatState } from '../../utils/seatPriority.js'
import { joinWaitlist, notifyWaitlist } from '../../utils/waitlist.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('notifyWaitlist', () => {
  it('tells the next people in line by email, and by WhatsApp when they left a number', async () => {
    vi.mocked(loadSeatState).mockResolvedValue({ openAvailable: 2 } as any)
    vi.mocked(query).mockImplementation((async (sql: string, params: any[]) => {
      if (sql.includes('UPDATE event_waitlist SET notified_at')) {
        expect(params).toEqual(['ev-1', 2])
        return {
          rows: [
            { name: 'Jane Wanjiku', email: 'jane@example.com', phone: '0712 345 678' },
            { name: null, email: 'guest@example.com', phone: null },
          ],
        }
      }
      if (sql.includes('SELECT title FROM events')) return { rows: [{ title: 'Ngong Hills Hike' }] }
      return { rows: [] }
    }) as any)

    expect(await notifyWaitlist('ev-1')).toBe(2)
    expect(sendEmail).toHaveBeenCalledTimes(2)
    expect(vi.mocked(sendEmail).mock.calls[0][0]).toMatchObject({
      to: 'jane@example.com',
      subject: expect.stringContaining('Ngong Hills Hike'),
    })
    expect(sendWaitlistSpot).toHaveBeenCalledTimes(1)
    expect(sendWaitlistSpot).toHaveBeenCalledWith('254712345678', {
      firstName: 'Jane',
      eventTitle: 'Ngong Hills Hike',
      link: expect.stringContaining('/events/ev-1'),
    })
  })

  it('tells nobody when no seat is open', async () => {
    vi.mocked(loadSeatState).mockResolvedValue({ openAvailable: 0 } as any)
    expect(await notifyWaitlist('ev-1')).toBe(0)
    expect(query).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe('joinWaitlist', () => {
  it('adds the person and returns their place in line', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('SELECT id FROM events')) return { rows: [{ id: 'ev-1' }] }
      if (sql.includes('COUNT(*)::int AS ahead')) return { rows: [{ ahead: 3 }] }
      return { rows: [] }
    }) as any)

    expect(await joinWaitlist('ev-1', { email: ' Jane@Example.com ', name: 'Jane', phone: '0712345678' })).toEqual({
      position: 4,
    })
    const insert = vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('INSERT INTO event_waitlist'))!
    expect(insert[1]).toEqual(['ev-1', null, 'Jane', 'jane@example.com', '0712345678'])
  })

  it('rejects an invalid email and an event that is not open', async () => {
    await expect(joinWaitlist('ev-1', { email: 'nope' })).rejects.toThrow('valid email')
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
    await expect(joinWaitlist('ev-x', { email: 'jane@example.com' })).rejects.toMatchObject({ status: 404 })
  })
})
