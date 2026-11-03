export const ANSWER_VALUES = {
  hardest_now: [
    'start_then_stop',
    'low_motivation',
    'no_time',
    'not_sure_where_to_start',
    'weight_stuck',
    'run_longer_race',
    'hike_safely',
    'mother_energy_body',
    'training_alone_boring',
    'cost',
    'other',
    'prefer_not_to_say',
  ],
  goal_3m: ['lose_weight', 'first_5k', 'run_10k_half', 'hike', 'stronger', 'more_energy', 'community', 'other', 'prefer_not_to_say'],
  time_with_trfc: ['first_time', 'lt_3m', '3_6m', '6_12m', '1_2y', 'gt_2y', 'prefer_not_to_say'],
  want_more: [
    'community_runs',
    'zone_walks',
    'hikes_trips',
    'coaching',
    'races_challenges',
    'workshops',
    'family_kids',
    'events_my_area',
    'other',
    'prefer_not_to_say',
  ],
  exercise_frequency: ['none', '1_2', '3_4', '5_plus', 'prefer_not_to_say'],
} as const

export type ChoiceField = keyof typeof ANSWER_VALUES
export const CHOICE_FIELDS = Object.keys(ANSWER_VALUES) as ChoiceField[]

/** Zone answers that are not a region; team zones are stored as the region slug. */
export const ZONE_EXTRAS = ['not_sure', 'outside', 'prefer_not_to_say'] as const

export const OTHER_TEXT_MAX = 120
