import { kes } from './membership'

export const JOIN_COPY = {
  hero: {
    eyebrow: 'TRFC membership',
    headline: 'Become a member',
    subline: 'Create your account or sign in, pay for membership, then open your paid member dashboard.',
    video: 'Membership video coming soon',
    hear: 'Tap to hear',
    button: 'Join now',
    trust: 'Pay with M-Pesa. Your free account stays free if you change your mind.',
  },
  perks: {
    eyebrow: 'What you get',
    heading: 'Membership unlocks the member side of TRFC',
    body: 'Everything in your free account stays. Membership adds the perks below for 12 months.',
    priceFallback: 'See your price after you sign in.',
    founding: (amount: string, left: number) => `${amount} founding price · ${left} places left`,
    standard: (amount: string) => `${amount} for 12 months`,
    paused: 'Membership sales are paused right now. You can still make an account.',
    opens: (date: string) => `Membership opens ${date}. You can make your account now.`,
  },
  auth: {
    eyebrow: 'Step 1',
    heading: 'Account first, then pay',
    body: 'New here? Make a free account. Already with us? Sign in. Next you will pay for membership on this page.',
  },
  pay: {
    eyebrow: 'Step 2',
    heading: 'Pay for membership',
    body: 'We send an M-Pesa prompt to your phone. When payment confirms, you go straight to your member dashboard.',
    priceHeading: 'Pay with M-Pesa',
  },
  loading: 'Loading your membership…',
  loadError: 'Could not load membership. Please refresh and try again.',
}

export function joinPriceLine(price: {
  available: boolean
  reason: 'opens' | 'paused' | null
  standard: number
  founding: number
  foundingLeft: number
  salesOpenAt: string
}): string {
  if (!price.available) {
    if (price.reason === 'paused') return JOIN_COPY.perks.paused
    const date = new Date(price.salesOpenAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Africa/Nairobi',
    })
    return JOIN_COPY.perks.opens(date)
  }
  if (price.foundingLeft > 0) return JOIN_COPY.perks.founding(kes(price.founding), price.foundingLeft)
  return JOIN_COPY.perks.standard(kes(price.standard))
}
