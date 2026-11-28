import type { CatalogProgram } from '../programs'
import type { FinderGoal, FinderLevel, ProgramQuizMatching } from '../../types/programContent'
import type { FinderAnswers } from './types'

export const FALLBACK_PROGRAM_ID = 'foundations'

export interface FinderMatch {
  program: CatalogProgram
  elite: CatalogProgram | null
}

function hasQuiz(entry: CatalogProgram): entry is CatalogProgram & { quiz: ProgramQuizMatching } {
  return !!entry.quiz && Array.isArray(entry.quiz.goals)
}

function levelFromAnswers(answers: FinderAnswers): FinderLevel | undefined {
  return answers.gymExperience
}

function matchesFilters(quiz: ProgramQuizMatching, answers: FinderAnswers): boolean {
  if (quiz.levels?.length) {
    const level = levelFromAnswers(answers)
    if (level && !quiz.levels.includes(level)) return false
  }
  if (quiz.raceDistances?.length && answers.raceDistance) {
    if (!quiz.raceDistances.includes(answers.raceDistance)) return false
  }
  if (quiz.hikeTargets?.length && answers.hikeTarget) {
    if (!quiz.hikeTargets.includes(answers.hikeTarget)) return false
  }
  if (quiz.trainWhere?.length && answers.trainWhere) {
    if (!quiz.trainWhere.includes(answers.trainWhere)) return false
  }
  return true
}

function score(entry: CatalogProgram): number {
  return entry.quiz?.priority ?? 0
}

/**
 * Pick a published catalog program for the finder answers.
 * Only published catalog entries are passed in. Fallback is foundations.
 */
export function matchFinder(answers: FinderAnswers, catalog: CatalogProgram[]): FinderMatch {
  const goal = answers.goal as FinderGoal | undefined
  const sex = answers.sex
  const withQuiz = catalog.filter(hasQuiz)

  let candidates = withQuiz.filter((entry) => {
    if (!goal || !entry.quiz.goals.includes(goal)) return false
    if (sex && entry.quiz.sex !== 'any' && entry.quiz.sex !== sex) return false
    return matchesFilters(entry.quiz, answers)
  })

  candidates = [...candidates].sort((a, b) => {
    const byPriority = score(b) - score(a)
    if (byPriority !== 0) return byPriority
    return a.sort_order - b.sort_order
  })

  const foundations =
    catalog.find((p) => p.id === FALLBACK_PROGRAM_ID) ??
    withQuiz.find((p) => p.id === FALLBACK_PROGRAM_ID) ??
    catalog[0]

  const program = candidates[0] ?? foundations
  if (!program) {
    throw new Error('No programs available for matching')
  }

  const elite =
    answers.hasChildren === 'yes'
      ? withQuiz.find((entry) => entry.quiz.eliteOffer === true) ?? null
      : null

  return { program, elite: elite && elite.id !== program.id ? elite : elite }
}

/** Server-side style check: is this program id a plausible match for these answers? */
export function isPlausibleMatch(
  programId: string,
  answers: FinderAnswers,
  catalog: CatalogProgram[]
): boolean {
  const { program } = matchFinder(answers, catalog)
  if (programId === FALLBACK_PROGRAM_ID) return true
  return program.id === programId
}
