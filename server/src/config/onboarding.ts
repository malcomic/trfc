export const PROGRAMS = ['foundations', 'fat_loss', 'endurance', 'hiking'] as const
export type ProgramId = (typeof PROGRAMS)[number]

export const TIERS = ['free', 'plus', 'elite'] as const
export type Tier = (typeof TIERS)[number]

export const PROGRAM_NAMES: Record<ProgramId, string> = {
  foundations: 'Foundations',
  fat_loss: 'Fat Loss & Fitness',
  endurance: 'Endurance & Race Prep',
  hiking: 'Hiking',
}

export const PRICES = { plusReturning: 197, plusNew: 497, elite: 2000 }
export const PAID_PROGRAMS: ProgramId[] = ['fat_loss', 'endurance', 'hiking']
export const ELITE_DAYS = 30

export function isProgramId(value: unknown): value is ProgramId {
  return typeof value === 'string' && (PROGRAMS as readonly string[]).includes(value)
}

export function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value)
}

/** Free never unlocks a paid program: it always resolves to Foundations. */
export function resolveProgram(program: ProgramId, tier: Tier): ProgramId {
  if (tier === 'free' && PAID_PROGRAMS.includes(program)) return 'foundations'
  return program
}

export function priceFor(tier: Tier, isReturning: boolean): number {
  if (tier === 'free') return 0
  if (tier === 'elite') return PRICES.elite
  return isReturning ? PRICES.plusReturning : PRICES.plusNew
}
