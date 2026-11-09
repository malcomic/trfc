import { programPath, type Program } from './programs'

export interface TickerItem {
  name: string
  detail: string
  to?: string
}

const TICKER_ORDER = ['foundations', 'hiking', 'endurance', 'fat_loss']

const ELITE_ITEM: TickerItem = {
  name: 'Elite Coaching for Mothers',
  detail: '12 weeks with the Head Coach · Members only · Starts January 2027',
}

function rank(id: string): number {
  const i = TICKER_ORDER.indexOf(id)
  return i === -1 ? TICKER_ORDER.length : i
}

/** Core programs keep their ticker order; programs added by admins follow in catalog order. */
export function tickerItems(programs: Program[]): TickerItem[] {
  const ordered = programs
    .map((program, index) => ({ program, index }))
    .sort((a, b) => rank(a.program.id) - rank(b.program.id) || a.index - b.index)
    .map(({ program }) => {
      const detail = [program.price === 0 ? 'Free' : null, `${program.lengthWeeks} weeks`, `Starts ${program.starts}`]
        .filter(Boolean)
        .join(' · ')
      return { name: program.name, detail, to: programPath(program.slug) }
    })
  return [...ordered, ELITE_ITEM]
}
