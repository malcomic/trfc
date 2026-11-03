/** Client-side mirror of the server's msisdn normalisation, for validation and display. */
export function toKenyanMsisdn(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = String(phone).replace(/\D/g, '')
  if (/^254[17]\d{8}$/.test(digits)) return digits
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`
  return null
}

export function formatLocalPhone(msisdn: string): string {
  const local = msisdn.startsWith('254') ? `0${msisdn.slice(3)}` : msisdn
  return local.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3')
}

export const MPESA_PHONE_ERROR = 'Enter a valid M-Pesa number, e.g. 0712 345 678'
export const MPESA_PHONE_PLACEHOLDER = '0712 345 678'

/** react-hook-form rules for an M-Pesa number typed as 07XX, 01XX, 254XX or +254XX. */
export const mpesaPhoneRules = {
  required: 'Phone number is required',
  validate: (value: string) => (toKenyanMsisdn(value) ? true : MPESA_PHONE_ERROR),
}

/** A saved phone in local format for prefilling a form, or '' if it is not a valid Kenyan number. */
export function localPhoneOrEmpty(phone: string | null | undefined): string {
  const msisdn = toKenyanMsisdn(phone)
  return msisdn ? formatLocalPhone(msisdn) : ''
}
