import type { FinderAnswers, FinderStepId } from './types'

export interface ChoiceOption<T extends string = string> {
  value: T
  label: string
}

export const GOAL_OPTIONS: ChoiceOption[] = [
  { value: 'lose_fat', label: 'Lose weight or fat' },
  { value: 'build_muscle', label: 'Build muscle' },
  { value: 'get_stronger', label: 'Get stronger' },
  { value: 'start_running', label: 'Start running' },
  { value: 'longer_race', label: 'Run a longer race' },
  { value: 'hike', label: 'Hike or climb a mountain' },
]

export const RACE_OPTIONS: ChoiceOption[] = [
  { value: '10k', label: 'First 10K' },
  { value: '15k', label: 'First 15K' },
  { value: '21k', label: 'First 21K' },
  { value: '42k', label: 'First 42K' },
]

export const VERSION_OPTIONS: ChoiceOption[] = [
  { value: 'women', label: "Women's version" },
  { value: 'men', label: "Men's version" },
]

export const AGE_OPTIONS: ChoiceOption[] = [
  { value: '18_29', label: '18 to 29' },
  { value: '30_39', label: '30 to 39' },
  { value: '40_49', label: '40 to 49' },
  { value: '50_59', label: '50 to 59' },
  { value: '60_plus', label: '60 and above' },
]

export const PROGRESS_OPTIONS: ChoiceOption[] = [
  { value: 'steady', label: 'Steady, every week' },
  { value: 'fast_then_slow', label: 'Big results early, then it slows' },
  { value: 'ups_and_downs', label: 'Ups and downs along the way' },
]

export const MUSCLE_ADD_OPTIONS: ChoiceOption[] = [
  { value: '2', label: '2 kg' },
  { value: '4', label: '4 kg' },
  { value: '6', label: '6 kg' },
  { value: '8_plus', label: '8 kg or more' },
  { value: 'unsure', label: 'I am not sure' },
]

export const FAT_AREA_OPTIONS_WOMEN: ChoiceOption[] = [
  { value: 'belly', label: 'Belly' },
  { value: 'hips', label: 'Hips' },
  { value: 'thighs', label: 'Thighs' },
  { value: 'upper_arms', label: 'Upper arms' },
  { value: 'back', label: 'Back' },
  { value: 'bum', label: 'Bum' },
]

export const FAT_AREA_OPTIONS_MEN: ChoiceOption[] = [
  { value: 'belly', label: 'Belly' },
  { value: 'love_handles', label: 'Love handles' },
  { value: 'chest', label: 'Chest' },
  { value: 'upper_arms', label: 'Upper arms' },
  { value: 'thighs', label: 'Thighs' },
  { value: 'back', label: 'Back' },
]

export const MUSCLE_AREA_OPTIONS: ChoiceOption[] = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms', label: 'Arms' },
  { value: 'abs', label: 'Abs' },
  { value: 'bum', label: 'Bum' },
  { value: 'legs', label: 'Legs' },
  { value: 'all_over', label: 'All over' },
]

export const GYM_OPTIONS: ChoiceOption[] = [
  { value: 'beginner', label: 'Beginner (just getting started, or only recently taking it seriously)' },
  { value: 'intermediate', label: 'Intermediate (I train consistently and know my way around the gym)' },
  { value: 'advanced', label: 'Advanced (I have trained for years and can plan my own workouts)' },
]

export const RUN_DISTANCE_OPTIONS: ChoiceOption[] = [
  { value: 'under_1', label: 'Less than 1 minute' },
  { value: '1_to_5', label: '1 to 5 minutes' },
  { value: 'about_5k', label: 'About 5 km' },
  { value: 'about_10k', label: 'About 10 km' },
  { value: '21_plus', label: '21 km or more' },
]

export const RACE_BEFORE_OPTIONS: ChoiceOption[] = [
  { value: 'never', label: 'Never' },
  { value: 'fun_run', label: 'A fun run' },
  { value: '10k_plus', label: 'A 10 km or longer' },
]

export const RUN_DAYS_OPTIONS: ChoiceOption[] = [
  { value: '2', label: '2 days' },
  { value: '3', label: '3 days' },
  { value: '4', label: '4 days' },
  { value: '5', label: '5 days' },
]

export const HIKE_LEVEL_OPTIONS: ChoiceOption[] = [
  { value: 'never', label: 'Never hiked' },
  { value: '1h', label: '1 hour' },
  { value: '2_3h', label: '2 to 3 hours' },
  { value: '4_6h', label: '4 to 6 hours' },
  { value: '6h_plus', label: 'More than 6 hours' },
]

export const HIKE_TARGET_OPTIONS: ChoiceOption[] = [
  { value: 'day_hikes', label: 'Day hikes and local trails' },
  { value: 'satima', label: 'Mt Satima or Elephant Hill' },
  { value: 'kenya', label: 'Mt Kenya, Point Lenana' },
  { value: 'unsure', label: 'I am not sure' },
]

export const YES_NO: ChoiceOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

export const H5_OPTIONS: ChoiceOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'prefer_not', label: 'I prefer not to say' },
]

export const SLEEP_OPTIONS: ChoiceOption[] = [
  { value: 'under_5', label: 'Under 5' },
  { value: '5_6', label: '5 to 6' },
  { value: '7_8', label: '7 to 8' },
  { value: '9_plus', label: '9 or more' },
]

export const WATER_OPTIONS: ChoiceOption[] = [
  { value: 'under_1', label: 'Under 1 litre' },
  { value: '1_2', label: '1 to 2 litres' },
  { value: '2_3', label: '2 to 3 litres' },
  { value: '3_plus', label: 'More than 3 litres' },
]

export const ACTIVITY_OPTIONS: ChoiceOption[] = [
  { value: 'sit', label: 'I sit most of the day' },
  { value: 'some_feet', label: 'I am on my feet some of the day' },
  { value: 'hardly_sit', label: 'I hardly sit still' },
]

export const STRESS_OPTIONS: ChoiceOption[] = [
  { value: 'not_much', label: 'Not much' },
  { value: 'some', label: 'Some' },
  { value: 'a_lot', label: 'A lot' },
  { value: 'too_much', label: 'Too much' },
]

export const MEALS_OPTIONS: ChoiceOption[] = [
  { value: '1_2', label: '1 to 2' },
  { value: '3', label: '3' },
  { value: '4_plus', label: '4 or more' },
  { value: 'changes', label: 'It changes every day' },
]

export const EATING_OUT_OPTIONS: ChoiceOption[] = [
  { value: 'hardly', label: 'Hardly ever' },
  { value: '1_2_week', label: '1 to 2 times a week' },
  { value: 'most_days', label: 'Most days' },
]

export const TRAIN_WHERE_OPTIONS: ChoiceOption[] = [
  { value: 'home', label: 'At home' },
  { value: 'gym', label: 'At the gym' },
  { value: 'outside', label: 'Outside' },
  { value: 'mix', label: 'A bit of everything' },
]

export const HOME_KIT_OPTIONS: ChoiceOption[] = [
  { value: 'nothing', label: 'Nothing' },
  { value: 'bands', label: 'Resistance bands' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'full', label: 'A full home gym' },
]

export const TRAIN_DAYS_OPTIONS: ChoiceOption[] = [
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5_plus', label: '5 or more' },
]

export const SESSION_OPTIONS: ChoiceOption[] = [
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '60 minutes' },
  { value: '75_plus', label: '75 minutes or more' },
]

export const LIFT_OPTIONS: ChoiceOption[] = [
  { value: 'never', label: 'Never done them' },
  { value: 'learning', label: 'Still learning' },
  { value: 'confident', label: 'Confident and consistent' },
  { value: 'not_option', label: 'Not an option for me' },
]

export const CARDIO_OPTIONS: ChoiceOption[] = [
  { value: 'rarely', label: 'Rarely or never' },
  { value: 'occasionally', label: 'Occasionally' },
  { value: 'frequently', label: 'Frequently' },
]

export const PAIN_OPTIONS: ChoiceOption[] = [
  { value: 'knees', label: 'Knees' },
  { value: 'lower_back', label: 'Lower back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'hips', label: 'Hips' },
  { value: 'none', label: 'None' },
]

export const FOOD_OPTIONS: ChoiceOption[] = [
  { value: 'everything', label: 'I eat everything' },
  { value: 'no_meat', label: 'I do not eat meat' },
  { value: 'no_pork', label: 'I do not eat pork' },
  { value: 'other', label: 'Other' },
]

export const STOPPED_OPTIONS: ChoiceOption[] = [
  { value: 'no_time', label: 'No time' },
  { value: 'no_energy', label: 'No energy' },
  { value: 'lost_motivation', label: 'Lost motivation' },
  { value: 'not_sure', label: 'Did not know what to do' },
  { value: 'cost', label: 'Cost' },
  { value: 'injury', label: 'An injury' },
]

export const WITH_SOMEONE_OPTIONS: ChoiceOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'depends', label: 'It depends' },
  { value: 'no', label: 'No' },
]

export const SUPPORT_OPTIONS: ChoiceOption[] = [
  { value: 'family', label: 'Family' },
  { value: 'friends', label: 'Friends' },
  { value: 'coach', label: 'A coach' },
  { value: 'myself', label: 'Myself' },
  { value: 'community', label: 'The community' },
]

export const HEARD_OPTIONS: ChoiceOption[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'community_run', label: 'A community run' },
  { value: 'friend', label: 'A friend' },
  { value: 'other', label: 'Other' },
]

export const ENERGY_WORKOUT_OPTIONS: ChoiceOption[] = [
  { value: 'strong', label: 'Strong from start to end' },
  { value: 'drops', label: 'Good, then it drops' },
  { value: 'up_down', label: 'Up and down' },
  { value: 'low', label: 'Low most of the time' },
]

export const ENERGY_WHEN_OPTIONS: ChoiceOption[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'evening', label: 'Evening' },
  { value: 'changes', label: 'It changes' },
]

export const ENERGY_DAYS_OPTIONS: ChoiceOption[] = [
  { value: '0_2', label: '0 to 2 days' },
  { value: '3_5', label: '3 to 5 days' },
  { value: '6_9', label: '6 to 9 days' },
  { value: '10_plus', label: '10 days or more' },
]

export function stepTitle(stepId: FinderStepId, answers: FinderAnswers, isReturning = false): string {
  const name = answers.name?.trim() || 'there'
  switch (stepId) {
    case 'Main':
      return "You already know why you're here."
    case 'Progress':
      return 'Before we start, what does progress look like over time?'
    case 'Truth':
      return 'None of these will be your path.'
    case 'Goal':
      return 'What do you want most right now?'
    case 'Race':
      return 'Which race?'
    case 'Version':
      return 'Which version of the program fits you?'
    case 'Age':
      return 'How old are you?'
    case 'Height':
      return 'How tall are you?'
    case 'Weight':
      return 'How much do you weigh now?'
    case 'PathShape':
      return 'Your path is taking shape.'
    case 'Name':
      return 'What should we call you?'
    case 'NameMsg':
      return `${name}, the next questions shape your plan.`
    case 'Photo':
      return 'Which picture looks most like you now?'
    case 'Reply':
      return 'Got it. That is a strong place to start.'
    case 'Target':
      return 'Which picture looks like where you want to be?'
    case 'GoalWeight':
      return 'How much do you want to weigh?'
    case 'MuscleGoal':
      return 'How much muscle do you want to add?'
    case 'FatAreas':
      return 'Where do you want to lose fat? Pick up to 3.'
    case 'MuscleAreas':
      return 'Which muscles do you want to see most? Pick up to 3.'
    case 'Testimonial':
      return 'Members who started where you are.'
    case 'Training':
      return 'How would you describe your gym experience?'
    case 'Thanks':
      return 'Thanks. We are building your plan.'
    case 'R1':
      return 'How far can you run without stopping?'
    case 'R2':
      return 'Have you run a race before?'
    case 'R3':
      return 'Do you have a race day in mind?'
    case 'R4':
      return 'How many days a week can you run?'
    case 'H1':
      return 'How long can you hike without stopping now?'
    case 'H2':
      return 'Which hike are you aiming for?'
    case 'H3':
      return 'Have you been above 3,000 m before?'
    case 'H4':
      return 'Do you have a trip date?'
    case 'H5':
      return 'Do you have a heart or lung condition?'
    case 'Email':
      return 'Where should we send your plan?'
    case 'EmailBack':
      return isReturning ? `Welcome back, ${name}.` : `Thanks, ${name}. Your plan is on the way.`
    case 'Chart':
      return 'You can reach your goal between the months ahead.'
    case 'L1':
      return 'How many hours do you sleep a night?'
    case 'L2':
      return 'How much water do you drink a day?'
    case 'L3':
      return 'How active is your day?'
    case 'L4':
      return 'How stressed are you most days?'
    case 'L5':
      return 'How many meals do you eat a day?'
    case 'L6':
      return 'How often do you eat out or order food in?'
    case 'MsgFlex':
      return 'Smart training is flexible.'
    case 'L7':
      return 'Where will you train?'
    case 'L8':
      return 'What do you have at home?'
    case 'L9':
      return 'How many days a week can you train?'
    case 'L10':
      return 'How long can each session be?'
    case 'L14':
      return 'How comfortable are you with the squat, bench press and deadlift?'
    case 'L15':
      return 'How often do you do cardio?'
    case 'Testimonial2':
      return 'You are not doing this alone.'
    case 'L11':
      return 'Do any of these hurt when you move? Pick up to 2.'
    case 'MsgGood':
      return "You're in good hands."
    case 'L12':
      return 'Is there food you do not eat?'
    case 'L13':
      return 'What has stopped you before? Pick up to 2.'
    case 'Children':
      return 'Do you have children?'
    case 'MsgCircle':
      return 'Your support circle.'
    case 'S1':
      return 'Would you like to do this with someone?'
    case 'S2':
      return 'Who keeps you going the most?'
    case 'S3':
      return 'Where did you hear about TRFC?'
    case 'Building':
      return 'How is your energy when you work out?'
    case 'Building2':
      return 'When do you feel most able to train?'
    case 'Building3':
      return 'How many days a month do you feel low on energy or slow to recover?'
    case 'Building4':
      return 'Your plan is almost ready.'
    case 'Result':
      return `${name}, here is your timeline.`
    case 'Offer':
      return `Your program is ready, ${name}.`
    default:
      return 'Continue'
  }
}
