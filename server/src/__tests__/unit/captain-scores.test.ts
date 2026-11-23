import { describe, expect, it } from 'vitest'
import { attendanceGrowthScore, newMembersScore } from '../../utils/pointsAwards.js'

describe('captain score helpers', () => {
  it('maps flat attendance growth to ~50', () => {
    expect(attendanceGrowthScore(0.4, 0.4)).toBe(50)
  })

  it('scores upward growth higher', () => {
    expect(attendanceGrowthScore(0.5, 0.3)).toBeGreaterThan(50)
  })

  it('scores downward growth lower', () => {
    expect(attendanceGrowthScore(0.2, 0.4)).toBeLessThan(50)
  })

  it('normalizes new members by zone size', () => {
    expect(newMembersScore(0, 20)).toBe(0)
    expect(newMembersScore(2, 20)).toBe(100)
    expect(newMembersScore(1, 20)).toBe(50)
  })
})
