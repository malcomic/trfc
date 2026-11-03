import { describe, it, expect } from 'vitest'
import { WATCHED_THRESHOLD, watchedEnough } from '../../utils/videoProgress'

describe('watchedEnough', () => {
  it('counts a video as watched from 90% onwards', () => {
    expect(WATCHED_THRESHOLD).toBe(0.9)
    expect(watchedEnough(0, 100)).toBe(false)
    expect(watchedEnough(89, 100)).toBe(false)
    expect(watchedEnough(90, 100)).toBe(true)
    expect(watchedEnough(100, 100)).toBe(true)
  })

  it('never counts a video whose length is unknown', () => {
    expect(watchedEnough(10, 0)).toBe(false)
    expect(watchedEnough(10, NaN)).toBe(false)
    expect(watchedEnough(10, Infinity)).toBe(false)
  })
})
