/** Body photo slots for Program Finder G1/G2 carousels. */
export const FINDER_BODY_SEXES = ['women', 'men'] as const
export type FinderBodySex = (typeof FINDER_BODY_SEXES)[number]

export const FINDER_BODY_INDEXES = [1, 2, 3, 4, 5] as const

export type FinderBodySlot = `finder_body_${FinderBodySex}_${(typeof FINDER_BODY_INDEXES)[number]}`

export const FINDER_BODY_SLOTS: FinderBodySlot[] = FINDER_BODY_SEXES.flatMap((sex) =>
  FINDER_BODY_INDEXES.map((n) => `finder_body_${sex}_${n}` as FinderBodySlot)
)

export function isFinderBodySlot(value: unknown): value is FinderBodySlot {
  return typeof value === 'string' && (FINDER_BODY_SLOTS as readonly string[]).includes(value)
}

export const FINDER_BODY_DEFAULT_LABELS: Record<FinderBodySlot, string> = {
  finder_body_women_1: 'Women body type 1',
  finder_body_women_2: 'Women body type 2',
  finder_body_women_3: 'Women body type 3',
  finder_body_women_4: 'Women body type 4',
  finder_body_women_5: 'Women body type 5',
  finder_body_men_1: 'Men body type 1',
  finder_body_men_2: 'Men body type 2',
  finder_body_men_3: 'Men body type 3',
  finder_body_men_4: 'Men body type 4',
  finder_body_men_5: 'Men body type 5',
}
