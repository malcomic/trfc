import { describe, expect, it } from 'vitest'
import { rewardKesForPoints } from '../../utils/rewardRedeem.js'

describe('rewardKesForPoints', () => {
  it('converts points to KSh at the redeem rate', () => {
    expect(rewardKesForPoints(50, 2, 1000)).toEqual({ points: 50, kes: 100 })
  })

  it('caps points so due never goes negative', () => {
    expect(rewardKesForPoints(100, 2, 50)).toEqual({ points: 25, kes: 50 })
  })

  it('returns zero for invalid inputs', () => {
    expect(rewardKesForPoints(0, 2, 100)).toEqual({ points: 0, kes: 0 })
    expect(rewardKesForPoints(-5, 2, 100)).toEqual({ points: 0, kes: 0 })
    expect(rewardKesForPoints(10.5, 2, 100)).toEqual({ points: 0, kes: 0 })
    expect(rewardKesForPoints(10, 2, 0)).toEqual({ points: 0, kes: 0 })
  })
})
