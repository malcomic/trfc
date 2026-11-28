import type { CatalogEntry } from './programCatalog.js'
import type { FinderGoal, ProgramQuizMatching } from '../types/programContent.js'

export const FALLBACK_PROGRAM_ID = 'foundations'

export interface FinderAnswerShape {
  goal?: string
  sex?: string
  gymExperience?: string
  raceDistance?: string
  hikeTarget?: string
  trainWhere?: string
  hasChildren?: string
}

function hasQuiz(entry: CatalogEntry): entry is CatalogEntry & { quiz: ProgramQuizMatching } {
  return !!entry.quiz && Array.isArray(entry.quiz.goals)
}

function matchesFilters(quiz: ProgramQuizMatching, answers: FinderAnswerShape): boolean {
  if (quiz.levels?.length && answers.gymExperience && !quiz.levels.includes(answers.gymExperience as never)) {
    return false
  }
  if (quiz.raceDistances?.length && answers.raceDistance && !quiz.raceDistances.includes(answers.raceDistance as never)) {
    return false
  }
  if (quiz.hikeTargets?.length && answers.hikeTarget && !quiz.hikeTargets.includes(answers.hikeTarget as never)) {
    return false
  }
  if (quiz.trainWhere?.length && answers.trainWhere && !quiz.trainWhere.includes(answers.trainWhere as never)) {
    return false
  }
  return true
}

export function matchFinderProgramId(answers: FinderAnswerShape, catalog: CatalogEntry[]): string {
  const goal = answers.goal as FinderGoal | undefined
  const sex = answers.sex
  const withQuiz = catalog.filter(hasQuiz)

  const candidates = withQuiz
    .filter((entry) => {
      if (!goal || !entry.quiz.goals.includes(goal)) return false
      if (sex && entry.quiz.sex !== 'any' && entry.quiz.sex !== sex) return false
      return matchesFilters(entry.quiz, answers)
    })
    .sort((a, b) => (b.quiz.priority ?? 0) - (a.quiz.priority ?? 0) || a.sort_order - b.sort_order)

  if (candidates[0]) return candidates[0].id
  if (catalog.some((p) => p.id === FALLBACK_PROGRAM_ID)) return FALLBACK_PROGRAM_ID
  return catalog[0]?.id ?? FALLBACK_PROGRAM_ID
}

export function isPlausibleFinderProgram(
  programId: string,
  answers: FinderAnswerShape,
  catalog: CatalogEntry[]
): boolean {
  if (programId === FALLBACK_PROGRAM_ID) return true
  return matchFinderProgramId(answers, catalog) === programId
}
