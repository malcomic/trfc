export type Tier = 'free' | 'plus' | 'elite'

export const TIER_LABELS: Record<Tier, string> = {
  free: 'Free',
  plus: 'TRFC+',
  elite: 'Elite',
}

/** Client-side mirror of the server's msisdn normalisation, for validation and display. */
export function toKenyanMsisdn(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (/^254[17]\d{8}$/.test(digits)) return digits
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`
  return null
}

export function formatLocalPhone(msisdn: string): string {
  const local = msisdn.startsWith('254') ? `0${msisdn.slice(3)}` : msisdn
  return local.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3')
}
