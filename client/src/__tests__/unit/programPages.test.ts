import { describe, it, expect } from 'vitest'
import {
  dayName,
  firstMissingAnswer,
  hasSessionPage,
  programPercent,
  splitHeading,
  weekStatus,
} from '../../content/programPages'
import { dashboardProgramPath, programPath } from '../../content/programs'
import { parseRouteNumber } from '../../pages/member/program/routeParams'
import { formatElapsed } from '../../components/member/program/SessionTimer'
import type { CheckinQuestion } from '../../api/programs'

describe('programPath and dashboardProgramPath', () => {
  it('builds the public page path from the slug', () => {
    expect(programPath('couch-to-5k')).toBe('/programs/couch-to-5k')
  })

  it('builds dashboard paths for the program, a week and a day', () => {
    expect(dashboardProgramPath('couch-to-5k')).toBe('/dashboard/programs/couch-to-5k')
    expect(dashboardProgramPath('couch-to-5k', 2)).toBe('/dashboard/programs/couch-to-5k/week/2')
    expect(dashboardProgramPath('couch-to-5k', 2, '/day/3')).toBe('/dashboard/programs/couch-to-5k/week/2/day/3')
  })
})

describe('weekStatus', () => {
  it('is done once checked in, otherwise open or locked', () => {
    expect(weekStatus({ locked: false, checkedIn: true })).toBe('done')
    expect(weekStatus({ locked: false, checkedIn: false })).toBe('open')
    expect(weekStatus({ locked: true, checkedIn: false })).toBe('locked')
  })
})

describe('programPercent', () => {
  it('counts finished weeks', () => {
    expect(programPercent(0, 8)).toBe(0)
    expect(programPercent(2, 8)).toBe(25)
    expect(programPercent(8, 8)).toBe(100)
    expect(programPercent(9, 8)).toBe(100)
    expect(programPercent(1, 0)).toBe(0)
  })
})

describe('firstMissingAnswer', () => {
  const questions: CheckinQuestion[] = [
    { id: 'feel', label: 'How did it feel?', type: 'choice', options: ['Easy', 'Hard'], required: true },
    { id: 'note', label: 'Anything else?', type: 'text', required: false },
  ]

  it('returns the first unanswered required question', () => {
    expect(firstMissingAnswer(questions, {})?.id).toBe('feel')
    expect(firstMissingAnswer(questions, { feel: '   ' })?.id).toBe('feel')
  })

  it('ignores optional questions', () => {
    expect(firstMissingAnswer(questions, { feel: 'Easy' })).toBeNull()
  })
})

describe('small helpers', () => {
  it('names days from Monday', () => {
    expect(dayName(1)).toBe('Monday')
    expect(dayName(6)).toBe('Saturday')
    expect(dayName(9)).toBe('Day 9')
  })

  it('opens a session page for every day except rest', () => {
    expect(hasSessionPage('run')).toBe(true)
    expect(hasSessionPage('community')).toBe(true)
    expect(hasSessionPage('rest')).toBe(false)
  })

  it('highlights the last word of a heading', () => {
    expect(splitHeading('Couch to 5K')).toEqual({ title: 'COUCH TO', highlight: '5K' })
    expect(splitHeading('Hiking')).toEqual({ title: 'HIKING' })
  })

  it('reads whole positive numbers from the URL', () => {
    expect(parseRouteNumber('3')).toBe(3)
    expect(parseRouteNumber('0')).toBeNull()
    expect(parseRouteNumber('2a')).toBeNull()
    expect(parseRouteNumber(undefined)).toBeNull()
  })

  it('formats the timer as minutes and seconds', () => {
    expect(formatElapsed(0)).toBe('00:00')
    expect(formatElapsed(125)).toBe('02:05')
  })
})
