import { describe, expect, it } from 'vitest'
import { nextStep } from '../../content/finder/schema'
import type { FinderAnswers } from '../../content/finder/types'

describe('finder nextStep', () => {
  it('routes running goals through Race then R1', () => {
    const answers: FinderAnswers = { goal: 'start_running' }
    expect(nextStep('Goal', answers)).toBe('Race')
    expect(nextStep('NameMsg', { ...answers, sex: 'women' })).toBe('R1')
  })

  it('routes hike goals through H1 and skips H5 persistence path into FatAreas', () => {
    const answers: FinderAnswers = { goal: 'hike', sex: 'men' }
    expect(nextStep('NameMsg', answers)).toBe('H1')
    expect(nextStep('H5', answers)).toBe('FatAreas')
  })

  it('routes fat loss through Photo and L8 only for home/mix', () => {
    const answers: FinderAnswers = { goal: 'lose_fat', sex: 'women', trainWhere: 'gym' }
    expect(nextStep('NameMsg', answers)).toBe('Photo')
    expect(nextStep('L7', answers)).toBe('L9')
    expect(nextStep('L7', { ...answers, trainWhere: 'home' })).toBe('L8')
  })

  it('branches women through Children and Building2', () => {
    const answers: FinderAnswers = { sex: 'women', withSomeone: 'yes' }
    expect(nextStep('L13', answers)).toBe('Children')
    expect(nextStep('Building', answers)).toBe('Building2')
    expect(nextStep('Building', { sex: 'men' })).toBe('Building4')
  })
})
