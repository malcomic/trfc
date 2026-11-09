import { describe, it, expect } from 'vitest'
import { matchProgram, weekLine, type ExperienceAnswer, type GoalAnswer } from '../../content/quiz'
import { CORE_PROGRAM_IDS, coreProgramName, isCoreProgramId, type CoreProgramId } from '../../content/programs'

type Row = [GoalAnswer, ExperienceAnswer, CoreProgramId, CoreProgramId | null]

const TABLE: Row[] = [
  ['move', 'none', 'foundations', null],
  ['move', 'some', 'foundations', null],
  ['move', 'active', 'foundations', null],
  ['move', 'runner', 'endurance', null],
  ['lose', 'none', 'foundations', 'fat_loss'],
  ['lose', 'some', 'foundations', 'fat_loss'],
  ['lose', 'active', 'fat_loss', null],
  ['lose', 'runner', 'fat_loss', null],
  ['race', 'none', 'foundations', 'endurance'],
  ['race', 'some', 'foundations', 'endurance'],
  ['race', 'active', 'foundations', 'endurance'],
  ['race', 'runner', 'endurance', null],
  ['out', 'none', 'foundations', 'hiking'],
  ['out', 'some', 'foundations', 'hiking'],
  ['out', 'active', 'hiking', null],
  ['out', 'runner', 'hiking', null],
]

describe('matchProgram', () => {
  it.each(TABLE)('goal %s + experience %s -> %s (next up %s)', (goal, experience, program, nextUp) => {
    expect(matchProgram(goal, experience)).toEqual({ program, nextUp })
  })
})

describe('weekLine', () => {
  it('returns the line for each days answer', () => {
    expect(weekLine('few')).toBe('Start with 2 or 3 days a week. That is enough to begin.')
    expect(weekLine('some')).toBe('4 or 5 days a week fits well. Keep 2 days for rest.')
    expect(weekLine('most')).toBe('You can train most days, but keep 1 or 2 days for rest. Rest is part of the plan.')
  })
})

describe('core programs', () => {
  it('only ever matches one of the four core programs', () => {
    for (const [goal, experience] of TABLE) {
      const { program, nextUp } = matchProgram(goal, experience)
      expect(CORE_PROGRAM_IDS).toContain(program)
      if (nextUp) expect(CORE_PROGRAM_IDS).toContain(nextUp)
    }
  })

  it('recognises core ids and names them', () => {
    expect(isCoreProgramId('fat_loss')).toBe(true)
    expect(isCoreProgramId('strength_for_runners')).toBe(false)
    expect(isCoreProgramId('constructor')).toBe(false)
    expect(coreProgramName('hiking')).toBe('Hiking')
    expect(coreProgramName('strength_for_runners')).toBe('strength_for_runners')
  })
})
