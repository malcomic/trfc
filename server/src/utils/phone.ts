export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '').replace(/^\+/, '')
}

export function phonesMatch(a: string, b: string): boolean {
  const msisdnA = toKenyanMsisdn(a)
  const msisdnB = toKenyanMsisdn(b)
  if (msisdnA && msisdnB) return msisdnA === msisdnB
  return normalizePhone(a) === normalizePhone(b)
}

/** Converts 07XX / 01XX / +2547XX / 2547XX / 7XX forms to 2547XXXXXXXX (or 2541...). */
export function toKenyanMsisdn(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = String(phone).replace(/\D/g, '')
  if (/^254[17]\d{8}$/.test(digits)) return digits
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`
  return null
}
