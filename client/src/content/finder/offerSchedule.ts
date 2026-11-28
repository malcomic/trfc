/** Date-only (YYYY-MM-DD) helpers for the Find My Program early-join offer. */

export interface OfferBonusConfig {
  number: number
  title: string
  body: string
  arrives: string
  /** Local calendar day the bonus is removed at midnight. Null = open through offer end. */
  closesAt: string | null
}

export interface OfferWeekWindow {
  count: number
  label: string
  /** Inclusive local start YYYY-MM-DD */
  start: string
  /** Inclusive local end YYYY-MM-DD */
  end: string
}

export interface OfferScheduleConfig {
  /** Last calendar day of the offer (inclusive), YYYY-MM-DD */
  endsAt: string
  weekWindows: OfferWeekWindow[]
  bonuses: OfferBonusConfig[]
}

export type BonusPillKind = 'open' | 'closes'

export interface ResolvedBonus extends OfferBonusConfig {
  open: boolean
  pillKind: BonusPillKind
  pillLabel: string
}

export interface OfferSchedule {
  ended: boolean
  openCount: number
  activeWeekIndex: number
  statusTitle: string
  statusSubline: string | null
  bonuses: ResolvedBonus[]
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatShortDate(iso: string): string {
  const date = parseLocalDate(iso)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}

function formatClosesPill(iso: string): string {
  const date = parseLocalDate(iso)
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' })
  const dayMonth = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `Closes ${weekday} ${dayMonth}`
}

function formatOpenUntilPill(endsAt: string): string {
  const date = parseLocalDate(endsAt)
  const dayMonth = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `Open until ${dayMonth}`
}

/** Bonus is still available before its close midnight (or through offer end). */
function isBonusOpen(bonus: OfferBonusConfig, today: Date, endsAt: string): boolean {
  if (bonus.closesAt) {
    return today.getTime() < parseLocalDate(bonus.closesAt).getTime()
  }
  return today.getTime() <= parseLocalDate(endsAt).getTime()
}

export function resolveOfferSchedule(config: OfferScheduleConfig, now: Date = new Date()): OfferSchedule {
  const today = startOfLocalDay(now)
  const end = parseLocalDate(config.endsAt)
  const ended = today.getTime() > end.getTime()

  const bonuses: ResolvedBonus[] = config.bonuses.map((bonus) => {
    const open = !ended && isBonusOpen(bonus, today, config.endsAt)
    if (bonus.closesAt) {
      return {
        ...bonus,
        open,
        pillKind: 'closes' as const,
        pillLabel: formatClosesPill(bonus.closesAt),
      }
    }
    return {
      ...bonus,
      open,
      pillKind: 'open' as const,
      pillLabel: formatOpenUntilPill(config.endsAt),
    }
  })

  const openBonuses = bonuses.filter((b) => b.open)
  const openCount = openBonuses.length

  const nextLeaving = openBonuses
    .filter((b) => b.closesAt)
    .sort((a, b) => parseLocalDate(a.closesAt!).getTime() - parseLocalDate(b.closesAt!).getTime())[0]

  let activeWeekIndex = -1
  for (let i = 0; i < config.weekWindows.length; i++) {
    const window = config.weekWindows[i]
    const start = parseLocalDate(window.start)
    const windowEnd = parseLocalDate(window.end)
    if (today.getTime() >= start.getTime() && today.getTime() <= windowEnd.getTime()) {
      activeWeekIndex = i
      break
    }
  }
  if (!ended && activeWeekIndex < 0 && today.getTime() < parseLocalDate(config.weekWindows[0].start).getTime()) {
    activeWeekIndex = 0
  }
  if (!ended && activeWeekIndex < 0) {
    activeWeekIndex = config.weekWindows.length - 1
  }

  let statusTitle: string
  let statusSubline: string | null = null
  if (ended) {
    statusTitle = 'This early-join offer has ended'
  } else if (openCount === 0) {
    statusTitle = 'No bonuses left in this offer'
  } else {
    statusTitle =
      openCount === config.bonuses.length
        ? `Today: all ${openCount} bonuses are open`
        : `Today: ${openCount} bonus${openCount === 1 ? '' : 'es'} ${openCount === 1 ? 'is' : 'are'} open`
    if (nextLeaving?.closesAt) {
      statusSubline = `Next to go on Monday ${formatShortDate(nextLeaving.closesAt)}: ${nextLeaving.title}`
    }
  }

  return {
    ended,
    openCount,
    activeWeekIndex,
    statusTitle,
    statusSubline,
    bonuses,
  }
}
