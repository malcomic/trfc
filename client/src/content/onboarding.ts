export type Tier = 'free' | 'plus' | 'elite'

export const TIER_LABELS: Record<Tier, string> = {
  free: 'Free',
  plus: 'TRFC+',
  elite: 'Elite',
}

export { toKenyanMsisdn, formatLocalPhone } from '../utils/phone'
