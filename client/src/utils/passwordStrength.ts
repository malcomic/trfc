export type PasswordStrength = { score: number; label: string; cls: '' | 'weak' | 'fair' | 'strong' }

export function getPasswordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: '', cls: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score: 1, label: 'Weak', cls: 'weak' }
  if (score <= 2) return { score: 2, label: 'Fair', cls: 'fair' }
  return { score: 3, label: 'Strong', cls: 'strong' }
}
