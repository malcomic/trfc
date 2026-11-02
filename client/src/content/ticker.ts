import { PROGRAMS, programPath, type ProgramId } from './programs'

export interface TickerItem {
  name: string
  detail: string
  to?: string
}

const TICKER_ORDER: ProgramId[] = ['foundations', 'hiking', 'endurance', 'fat_loss']

export const TICKER_ITEMS: TickerItem[] = [
  ...TICKER_ORDER.map((id) => {
    const program = PROGRAMS[id]
    const detail = [program.price === 0 ? 'Free' : null, `${program.lengthWeeks} weeks`, `Starts ${program.starts}`]
      .filter(Boolean)
      .join(' · ')
    return { name: program.name, detail, to: programPath(id) }
  }),
  {
    name: 'Elite Coaching for Mothers',
    detail: '12 weeks with the Head Coach · Members only · Starts January 2027',
  },
]
