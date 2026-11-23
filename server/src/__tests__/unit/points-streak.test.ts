import { describe, expect, it } from 'vitest'
import { computeStreakState, countEarnedStreakBonuses } from '../../utils/pointsStreak.js'
import { verifyPassToken, memberPassPayload, parseMemberPassPayload } from '../../utils/memberTotpPass.js'
import { createHmac } from 'crypto'

describe('computeStreakState', () => {
  const sats = ['2027-01-02', '2027-01-09', '2027-01-16', '2027-01-23', '2027-01-30', '2027-02-06']

  it('awards a bonus every 4 attended Saturdays', () => {
    const attended = new Set(['2027-01-02', '2027-01-09', '2027-01-16', '2027-01-23'])
    expect(countEarnedStreakBonuses(sats.slice(0, 4), attended, 4)).toBe(1)
    const state = computeStreakState(sats.slice(0, 4), attended, 4)
    expect(state.progress).toBe(0)
    expect(state.freeMissAvailable).toBe(true)
  })

  it('allows one free miss without resetting', () => {
    const attended = new Set(['2027-01-02', '2027-01-09', '2027-01-23'])
    // miss 01-16 with free miss, then attend 01-23 → progress 3
    const state = computeStreakState(sats.slice(0, 4), attended, 4)
    expect(state.progress).toBe(3)
    expect(state.freeMissAvailable).toBe(false)
  })

  it('resets after a second consecutive miss', () => {
    const attended = new Set(['2027-01-02', '2027-01-23'])
    // attend, miss (free), miss (reset), attend → progress 1
    const state = computeStreakState(sats.slice(0, 4), attended, 4)
    expect(state.progress).toBe(1)
    expect(state.freeMissAvailable).toBe(true)
  })
})

describe('memberTotpPass', () => {
  it('verifies tokens in the current and adjacent windows', () => {
    const secret = 'abc123secret'
    const now = 1_700_000_000_000
    const window = Math.floor(now / 1000 / 30)
    const token = createHmac('sha256', secret).update(String(window)).digest('hex').slice(0, 12)
    expect(verifyPassToken(secret, token, now)).toBe(true)
    expect(verifyPassToken(secret, token, now + 25_000)).toBe(true)
    expect(verifyPassToken(secret, '000000000000', now)).toBe(false)
  })

  it('parses memberpass payloads', () => {
    const userId = '22222222-2222-4222-8222-222222222222'
    const payload = memberPassPayload(userId, 'abcdef123456')
    expect(parseMemberPassPayload(payload)).toEqual({ userId, token: 'abcdef123456' })
  })
})
