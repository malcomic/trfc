import type {
  FinderGoal,
  FinderHikeTarget,
  FinderLevel,
  FinderRaceDistance,
  FinderSex,
  FinderTrainWhere,
} from '../../types/programContent'

export type FinderSexAnswer = Exclude<FinderSex, 'any'>

export interface FinderAnswers {
  progressShape?: 'steady' | 'fast_then_slow' | 'ups_and_downs'
  goal?: FinderGoal
  raceDistance?: FinderRaceDistance
  sex?: FinderSexAnswer
  age?: '18_29' | '30_39' | '40_49' | '50_59' | '60_plus'
  heightCm?: number
  weightKg?: number
  name?: string
  bodyPhoto?: number
  targetPhoto?: number
  goalWeightKg?: number
  muscleAddKg?: '2' | '4' | '6' | '8_plus' | 'unsure'
  fatAreas?: string[]
  muscleAreas?: string[]
  gymExperience?: FinderLevel
  runDistance?: 'under_1' | '1_to_5' | 'about_5k' | 'about_10k' | '21_plus'
  raceBefore?: 'never' | 'fun_run' | '10k_plus'
  raceDay?: string | null
  runDays?: '2' | '3' | '4' | '5'
  hikeLevel?: 'never' | '1h' | '2_3h' | '4_6h' | '6h_plus'
  hikeTarget?: FinderHikeTarget
  altitudeBefore?: 'yes' | 'no'
  tripDate?: string | null
  email?: string
  phone?: string
  sleep?: string
  water?: string
  dailyActivity?: string
  stress?: string
  meals?: string
  eatingOut?: string
  trainWhere?: FinderTrainWhere
  homeKit?: string
  trainDays?: string
  sessionLength?: string
  liftComfort?: string
  cardio?: string
  painAreas?: string[]
  foodAvoid?: string
  stoppedBefore?: string[]
  hasChildren?: 'yes' | 'no'
  withSomeone?: 'yes' | 'depends' | 'no'
  supportWho?: string
  heardAbout?: string
  energyWorkout?: string
  energyWhen?: string
  energyDays?: string
}

export type FinderStepId =
  | 'Main'
  | 'Progress'
  | 'Truth'
  | 'Goal'
  | 'Race'
  | 'Version'
  | 'Age'
  | 'Height'
  | 'Weight'
  | 'PathShape'
  | 'Name'
  | 'NameMsg'
  | 'Photo'
  | 'Reply'
  | 'Target'
  | 'GoalWeight'
  | 'MuscleGoal'
  | 'FatAreas'
  | 'MuscleAreas'
  | 'Testimonial'
  | 'Training'
  | 'Thanks'
  | 'R1'
  | 'R2'
  | 'R3'
  | 'R4'
  | 'H1'
  | 'H2'
  | 'H3'
  | 'H4'
  | 'H5'
  | 'Email'
  | 'EmailBack'
  | 'Chart'
  | 'L1'
  | 'L2'
  | 'L3'
  | 'L4'
  | 'L5'
  | 'L6'
  | 'MsgFlex'
  | 'L7'
  | 'L8'
  | 'L9'
  | 'L10'
  | 'L14'
  | 'L15'
  | 'Testimonial2'
  | 'L11'
  | 'MsgGood'
  | 'L12'
  | 'L13'
  | 'Children'
  | 'MsgCircle'
  | 'S1'
  | 'S2'
  | 'S3'
  | 'Building'
  | 'Building2'
  | 'Building3'
  | 'Building4'
  | 'Result'
  | 'Offer'

export type FinderPhase = 'getting_started' | 'your_goal' | 'your_plan'

export interface FinderDraft {
  version: 2
  stepId: FinderStepId
  answers: FinderAnswers
  identity?: { userId?: string; isReturning?: boolean; email?: string; phone?: string }
  derived?: { programId?: string; eliteProgramId?: string | null }
  updatedAt: string
}
