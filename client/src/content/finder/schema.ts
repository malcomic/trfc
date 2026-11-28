import type { FinderAnswers, FinderPhase, FinderStepId } from './types'

const STRENGTH_GOALS = new Set(['lose_fat', 'build_muscle', 'get_stronger'])
const RUN_GOALS = new Set(['start_running', 'longer_race'])

export function phaseFor(stepId: FinderStepId): FinderPhase {
  if (
    [
      'Main',
      'Progress',
      'Truth',
      'Goal',
      'Race',
      'Version',
      'Age',
      'Height',
      'Weight',
      'PathShape',
      'Name',
      'NameMsg',
    ].includes(stepId)
  ) {
    return 'getting_started'
  }
  if (
    [
      'Photo',
      'Reply',
      'Target',
      'GoalWeight',
      'MuscleGoal',
      'FatAreas',
      'MuscleAreas',
      'Testimonial',
      'Training',
      'Thanks',
      'R1',
      'R2',
      'R3',
      'R4',
      'H1',
      'H2',
      'H3',
      'H4',
      'H5',
      'Email',
      'EmailBack',
      'Chart',
    ].includes(stepId)
  ) {
    return 'your_goal'
  }
  return 'your_plan'
}

export function phaseProgress(stepId: FinderStepId): number {
  const phase = phaseFor(stepId)
  if (phase === 'getting_started') return 0.2
  if (phase === 'your_goal') return 0.55
  return 1
}

function afterBasics(answers: FinderAnswers): FinderStepId {
  const goal = answers.goal
  if (goal && STRENGTH_GOALS.has(goal)) return 'Photo'
  if (goal && RUN_GOALS.has(goal)) return 'R1'
  if (goal === 'hike') return 'H1'
  return 'Photo'
}

function afterGoalBranch(answers: FinderAnswers): FinderStepId {
  // Fat/muscle areas already asked in strength path; run/hike still need them
  const goal = answers.goal
  if (goal && STRENGTH_GOALS.has(goal)) return 'Testimonial'
  return 'FatAreas'
}

/** Next step after the current one, given answers so far. */
export function nextStep(stepId: FinderStepId, answers: FinderAnswers): FinderStepId | null {
  switch (stepId) {
    case 'Main':
      return 'Progress'
    case 'Progress':
      return 'Truth'
    case 'Truth':
      return 'Goal'
    case 'Goal':
      return answers.goal && RUN_GOALS.has(answers.goal) ? 'Race' : 'Version'
    case 'Race':
      return 'Version'
    case 'Version':
      return 'Age'
    case 'Age':
      return 'Height'
    case 'Height':
      return 'Weight'
    case 'Weight':
      return 'PathShape'
    case 'PathShape':
      return 'Name'
    case 'Name':
      return 'NameMsg'
    case 'NameMsg':
      return afterBasics(answers)
    case 'Photo':
      return 'Reply'
    case 'Reply':
      return 'Target'
    case 'Target':
      return answers.goal === 'lose_fat' ? 'GoalWeight' : 'MuscleGoal'
    case 'GoalWeight':
    case 'MuscleGoal':
      return 'FatAreas'
    case 'FatAreas':
      return 'MuscleAreas'
    case 'MuscleAreas':
      return answers.goal && STRENGTH_GOALS.has(answers.goal) ? 'Testimonial' : 'Thanks'
    case 'Testimonial':
      return 'Training'
    case 'Training':
      return 'Thanks'
    case 'R1':
      return 'R2'
    case 'R2':
      return 'R3'
    case 'R3':
      return 'R4'
    case 'R4':
      return afterGoalBranch(answers)
    case 'H1':
      return 'H2'
    case 'H2':
      return 'H3'
    case 'H3':
      return 'H4'
    case 'H4':
      return 'H5'
    case 'H5':
      return afterGoalBranch(answers)
    case 'Thanks':
      return 'Email'
    case 'Email':
      return answers.email || answers.phone ? 'EmailBack' : 'Chart'
    case 'EmailBack':
      return 'Chart'
    case 'Chart':
      return 'L1'
    case 'L1':
      return 'L2'
    case 'L2':
      return 'L3'
    case 'L3':
      return 'L4'
    case 'L4':
      return 'L5'
    case 'L5':
      return 'L6'
    case 'L6':
      return 'MsgFlex'
    case 'MsgFlex':
      return 'L7'
    case 'L7':
      return answers.trainWhere === 'home' || answers.trainWhere === 'mix' ? 'L8' : 'L9'
    case 'L8':
      return 'L9'
    case 'L9':
      return 'L10'
    case 'L10':
      return 'L14'
    case 'L14':
      return 'L15'
    case 'L15':
      return 'Testimonial2'
    case 'Testimonial2':
      return 'L11'
    case 'L11':
      return 'MsgGood'
    case 'MsgGood':
      return 'L12'
    case 'L12':
      return 'L13'
    case 'L13':
      return answers.sex === 'women' ? 'Children' : 'MsgCircle'
    case 'Children':
      return 'MsgCircle'
    case 'MsgCircle':
      return 'S1'
    case 'S1':
      return answers.withSomeone === 'no' ? 'S3' : 'S2'
    case 'S2':
      return 'S3'
    case 'S3':
      return 'Building'
    case 'Building':
      return answers.sex === 'women' ? 'Building2' : 'Building4'
    case 'Building2':
      return 'Building3'
    case 'Building3':
      return 'Building4'
    case 'Building4':
      return 'Result'
    case 'Result':
      return 'Offer'
    case 'Offer':
      return null
    default:
      return null
  }
}

export function prevStep(history: FinderStepId[]): FinderStepId | null {
  if (history.length < 2) return null
  return history[history.length - 2] ?? null
}

export const PROMO_LINE = 'First 200 members get Couch to 5K free'

export const PHASE_LABELS: Record<FinderPhase, string> = {
  getting_started: 'Getting Started',
  your_goal: 'Your Goal',
  your_plan: 'Your Plan',
}
