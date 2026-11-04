export const GUEST_SIGNUP_DISMISSED_KEY = 'trfc_guest_signup_dismissed'

export interface GuestDetails {
  name?: string | null
  email?: string | null
  phone?: string | null
}

function guestQuery(details: GuestDetails, redirect: string): string {
  const params = new URLSearchParams()
  for (const key of ['name', 'email', 'phone'] as const) {
    const value = details[key]?.trim()
    if (value) params.set(key, value)
  }
  params.set('redirect', redirect)
  return params.toString()
}

export function buildGuestSignupUrl(details: GuestDetails, redirect = '/dashboard'): string {
  return `/register?${guestQuery(details, redirect)}`
}

export function buildGuestLoginUrl(details: GuestDetails, redirect = '/dashboard'): string {
  const params = new URLSearchParams()
  const email = details.email?.trim()
  if (email) params.set('email', email)
  params.set('redirect', redirect)
  return `/login?${params.toString()}`
}

export function isGuestSignupDismissed(): boolean {
  try {
    return localStorage.getItem(GUEST_SIGNUP_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissGuestSignup(): void {
  try {
    localStorage.setItem(GUEST_SIGNUP_DISMISSED_KEY, '1')
  } catch {
    // Private browsing can block storage; hiding for this visit is enough.
  }
}
