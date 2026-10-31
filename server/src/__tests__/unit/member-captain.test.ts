import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))
vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

import { query } from '../../config/db.js'
import { sendEmail } from '../../utils/emailService.js'
import {
  CAPTAIN_CHANGE_DAYS,
  CaptainChangeError,
  changeMyCaptain,
  getCaptainOptions,
  nextChangeAt,
  notifyCaptains,
} from '../../utils/memberCaptain.js'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OLD_CAPTAIN = '22222222-2222-4222-8222-222222222222'
const NEW_CAPTAIN = '33333333-3333-4333-8333-333333333333'
const DAY_MS = 86_400_000

interface State {
  captain_id?: string | null
  captain_chosen_at?: Date | null
  captain_active?: boolean | null
  zone_id?: string | null
  zone_name?: string | null
}

function mockDb(state: State, opts: { updated?: boolean; captains?: any[] } = {}) {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('FROM users u') && sql.includes('LEFT JOIN regions z')) {
      return {
        rows: [
          {
            captain_id: null,
            captain_chosen_at: null,
            captain_active: null,
            zone_id: null,
            zone_name: null,
            ...state,
          },
        ],
      }
    }
    if (sql.includes('FROM captains c') && sql.includes('ORDER BY r.name')) return { rows: opts.captains ?? [] }
    if (sql.includes('UPDATE users u')) {
      return { rows: opts.updated === false ? [] : [{ previous_captain_id: state.captain_id ?? null }] }
    }
    if (sql.includes('WHERE u.id = ANY')) {
      return {
        rows: [
          { id: USER_ID, name: 'Jane Wanjiku', email: 'jane@example.com' },
          { id: NEW_CAPTAIN, name: 'Irene Achieng', email: 'irene@example.com' },
          { id: OLD_CAPTAIN, name: 'Tom Otieno', email: 'tom@example.com' },
        ],
      }
    }
    return { rows: [] }
  }) as any)
}

const updateCall = () => vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('UPDATE users u'))
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => vi.clearAllMocks())

describe('nextChangeAt', () => {
  const now = new Date('2026-10-31T09:00:00Z')

  it('lets a member without a captain choose now', () => {
    expect(nextChangeAt({ captain_id: null, captain_chosen_at: null, captain_active: false }, now)).toBeNull()
  })

  it(`waits ${CAPTAIN_CHANGE_DAYS} days after the last choice`, () => {
    const chosen = new Date(now.getTime() - 10 * DAY_MS)
    expect(nextChangeAt({ captain_id: OLD_CAPTAIN, captain_chosen_at: chosen, captain_active: true }, now)).toEqual(
      new Date(chosen.getTime() + 30 * DAY_MS)
    )
    const longAgo = new Date(now.getTime() - 31 * DAY_MS)
    expect(nextChangeAt({ captain_id: OLD_CAPTAIN, captain_chosen_at: longAgo, captain_active: true }, now)).toBeNull()
  })

  it('lets the member change straight away when their captain is no longer active', () => {
    const chosen = new Date(now.getTime() - DAY_MS)
    expect(nextChangeAt({ captain_id: OLD_CAPTAIN, captain_chosen_at: chosen, captain_active: false }, now)).toBeNull()
  })
})

describe('getCaptainOptions', () => {
  it("lists only active captains in the member's zone", async () => {
    mockDb(
      { captain_id: OLD_CAPTAIN, captain_chosen_at: new Date(Date.now() - 40 * DAY_MS), captain_active: true, zone_id: 'zone-thika', zone_name: 'Thika' },
      { captains: [{ id: NEW_CAPTAIN, name: 'Irene Achieng', region_id: 'zone-thika', zone: 'Thika' }] }
    )
    const options = await getCaptainOptions(USER_ID)

    const listCall = vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('ORDER BY r.name'))!
    expect(String(listCall[0])).toContain("c.status = 'active' AND r.is_active = true")
    expect(String(listCall[0])).toContain('$2::uuid IS NULL OR c.region_id = $2::uuid')
    expect(listCall[1]).toEqual([USER_ID, 'zone-thika'])
    expect(options).toMatchObject({
      zone: { id: 'zone-thika', name: 'Thika' },
      current_captain_id: OLD_CAPTAIN,
      next_change_at: null,
      change_days: 30,
      captains: [{ id: NEW_CAPTAIN, name: 'Irene', region_id: 'zone-thika', zone: 'Thika' }],
    })
  })

  it('uses the referral zone first, then the current captain zone', async () => {
    mockDb({})
    await getCaptainOptions(USER_ID)
    const stateCall = vi.mocked(query).mock.calls[0]
    expect(String(stateCall[0])).toContain('COALESCE(u.referred_by_region_id, oc.region_id)')
  })
})

describe('changeMyCaptain', () => {
  it('sets a first captain within the zone and emails them', async () => {
    mockDb({ zone_id: 'zone-thika', zone_name: 'Thika' })

    await expect(changeMyCaptain(USER_ID, NEW_CAPTAIN)).resolves.toEqual({ captainId: NEW_CAPTAIN, previousCaptainId: null })
    const [sql, params] = updateCall()!
    expect(String(sql)).toContain('(me.zone_id IS NULL OR c.region_id = me.zone_id)')
    expect(String(sql)).toContain('u.captain_chosen_at <= NOW() - make_interval(days => $3)')
    expect(String(sql)).not.toContain('referred_by_region_id =')
    expect(params).toEqual([USER_ID, NEW_CAPTAIN, 30])

    await flush()
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendEmail).mock.calls[0][0]).toMatchObject({
      to: 'irene@example.com',
      subject: 'Jane W. chose you as their captain',
    })
  })

  it('emails both captains when a member switches', async () => {
    mockDb({ captain_id: OLD_CAPTAIN, captain_chosen_at: new Date(Date.now() - 31 * DAY_MS), captain_active: true, zone_id: 'zone-thika' })

    await expect(changeMyCaptain(USER_ID, NEW_CAPTAIN)).resolves.toEqual({ captainId: NEW_CAPTAIN, previousCaptainId: OLD_CAPTAIN })
    await flush()
    const recipients = vi.mocked(sendEmail).mock.calls.map(([mail]) => (mail as { to: string }).to)
    expect(recipients).toEqual(['irene@example.com', 'tom@example.com'])
    expect((vi.mocked(sendEmail).mock.calls[1][0] as { subject: string }).subject).toBe('Jane W. moved to another captain')
  })

  it(`refuses a second change within ${CAPTAIN_CHANGE_DAYS} days`, async () => {
    mockDb({ captain_id: OLD_CAPTAIN, captain_chosen_at: new Date(Date.now() - 5 * DAY_MS), captain_active: true, zone_id: 'zone-thika' })

    const error = await changeMyCaptain(USER_ID, NEW_CAPTAIN).catch((e) => e)
    expect(error).toBeInstanceOf(CaptainChangeError)
    expect(error.status).toBe(429)
    expect(error.message).toMatch(/once every 30 days/)
    expect(updateCall()).toBeUndefined()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('rejects a captain outside the zone (the update matches nothing)', async () => {
    mockDb({ zone_id: 'zone-thika', zone_name: 'Thika' }, { updated: false })

    await expect(changeMyCaptain(USER_ID, NEW_CAPTAIN)).rejects.toMatchObject({
      status: 400,
      message: 'Choose an active captain in the Thika zone',
    })
    await flush()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('rejects the current captain and malformed ids', async () => {
    mockDb({ captain_id: NEW_CAPTAIN, captain_active: true })
    await expect(changeMyCaptain(USER_ID, NEW_CAPTAIN)).rejects.toMatchObject({ message: 'This is already your captain' })
    await expect(changeMyCaptain(USER_ID, 'nope')).rejects.toMatchObject({ status: 400 })
    expect(updateCall()).toBeUndefined()
  })
})

describe('notifyCaptains', () => {
  it('skips captains without an email address', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        { id: USER_ID, name: 'Jane', email: null },
        { id: NEW_CAPTAIN, name: 'Irene', email: null },
      ],
    } as any)
    await notifyCaptains(USER_ID, NEW_CAPTAIN, null)
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
