export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '').replace(/^\+/, '')
}

export function phonesMatch(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b)
}
