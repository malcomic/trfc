import { describe, it, expect } from 'vitest'
import { matchProgram, weekLine, type ExperienceAnswer, type GoalAnswer } from '../../content/quiz'
import { programBySlug, PROGRAMS, PROGRAM_ORDER, type ProgramId } from '../../content/programs'

type Row = [GoalAnswer, ExperienceAnswer, ProgramId, ProgramId | null]

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

describe('programBySlug', () => {
  it('resolves every program slug and rejects unknown ones', () => {
    for (const id of PROGRAM_ORDER) expect(programBySlug(PROGRAMS[id].slug)?.id).toBe(id)
    expect(programBySlug('nope')).toBeUndefined()
    expect(programBySlug('constructor')).toBeUndefined()
    expect(programBySlug(undefined)).toBeUndefined()
  })
})
