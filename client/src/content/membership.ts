import type { MembershipQuote } from '../api/membership'

const DAY_MS = 24 * 60 * 60 * 1000
export const RENEW_SOON_DAYS = 30

export type RenewalState = 'none' | 'active' | 'renew_soon' | 'grace' | 'lapsed'

export const kes = (amount: number) => `KSh ${Math.round(amount).toLocaleString('en-US')}`

/** "31 December 2026" in Nairobi time. */
export function memberDate(iso: string | Date, withYear = true): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'Africa/Nairobi',
  })
}

/** "Thu 12 November, 6:30 pm" in Nairobi time. */
export function memberDateTime(iso: string | Date): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Nairobi',
  })
  const time = date
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Nairobi' })
    .toLowerCase()
  return `${day}, ${time}`
}

export const EARLY_BOOKING_HOURS = 48

/** End of the members-only booking window, counted from when the event was created. */
export function earlyWindowEnd(createdAt: string | Date, hours = EARLY_BOOKING_HOURS): Date {
  return new Date(new Date(createdAt).getTime() + hours * 60 * 60 * 1000)
}

/** Whether the shop discount line applies to this cart. */
export function shopDiscountFor(
  items: { price: number; quantity: number; eligible: boolean; flash: boolean }[],
  status: { available: boolean; amount: number } | null | undefined
): number {
  if (!status?.available) return 0
  const eligible = items.reduce((sum, i) => (i.eligible && !i.flash ? sum + i.price * i.quantity : sum), 0)
  return Math.max(0, Math.min(status.amount, eligible))
}

/** Where a member stands: never joined, active, in the last 30 days, in the renewal window after expiry, or lapsed. */
export function renewalState(
  membership: { until: string | null; renewalUntil?: string | null } | null | undefined,
  now: Date = new Date()
): RenewalState {
  if (!membership?.until) return 'none'
  const until = new Date(membership.until).getTime()
  if (Number.isNaN(until)) return 'none'
  if (until > now.getTime()) return until - now.getTime() <= RENEW_SOON_DAYS * DAY_MS ? 'renew_soon' : 'active'
  const renewalUntil = membership.renewalUntil ? new Date(membership.renewalUntil).getTime() : NaN
  return !Number.isNaN(renewalUntil) && now.getTime() <= renewalUntil ? 'grace' : 'lapsed'
}

export function quoteLine(quote: Pick<MembershipQuote, 'priceType' | 'amount'>): string {
  switch (quote.priceType) {
    case 'founding':
      return `Founding price: ${kes(quote.amount)} for 12 months`
    case 'renewal':
      return `Renew for ${kes(quote.amount)} for 12 months`
    default:
      return `${kes(quote.amount)} for 12 months`
  }
}

export function foundingLine(left: number, limit: number, deadline: string): string | null {
  if (left <= 0) return null
  return `${left} of ${limit} founding places left, until ${memberDate(deadline, false)}`
}

export const MEMBERSHIP_COPY = {
  title: 'MY',
  highlight: 'MEMBERSHIP',
  subtitle: 'An upgrade on your free account.',
  hero: {
    heading: 'Upgrade, keep everything',
    body: 'Membership is an upgrade on your free account. You keep everything you have now, and nobody has to join.',
  },
  perksHeading: 'What members get',
  comingSoon: 'Coming soon',
  price: {
    heading: 'Your price',
    year: (start: string, end: string) => `Covers ${start} to ${end}`,
    phoneLabel: 'M-Pesa number',
    phoneHelp: 'We send the M-Pesa prompt to this number.',
    pay: (amount: string) => `Pay ${amount} with M-Pesa`,
    paying: 'Sending the prompt…',
    opens: (date: string) => `Opens ${date}`,
    paused: 'Membership sales are paused right now. Please check back soon.',
    waiting: 'Waiting for your last payment. Check your phone for the M-Pesa prompt.',
    checkWaiting: 'Check my last payment',
  },
  active: {
    badge: 'Member',
    founding: 'Founding member',
    until: (date: string) => `Member until ${date}`,
    renewHeading: 'Renew your membership',
    renewBody: (start: string) => `Your new year starts ${start}, so you lose no days.`,
    yourPerks: 'Your perks',
  },
  grace: {
    heading: 'Your membership has ended',
    body: (amount: string, date: string) => `Renew at ${amount} until ${date}. After that, membership is full price.`,
  },
  lapsed: {
    heading: 'Come back to membership',
    body: 'Your free account is still here. Rejoin to get your member perks back.',
  },
  history: {
    heading: 'Past years',
    receipt: 'Receipt',
    type: {
      founding: 'Founding',
      standard: 'Standard',
      renewal: 'Renewal',
      gift: 'Gift',
    } as Record<string, string>,
    cancelled: 'Cancelled',
    empty: 'Your membership years will show here.',
  },
  success: {
    title: "You're a member",
    body: 'Your membership is active. A confirmation email is on its way.',
  },
  pollMessages: {
    rejected: 'The payment did not go through. Please try again.',
    timeout: 'We have not heard back from M-Pesa yet. If money left your account, your membership will show here shortly.',
    unreachable: 'We could not check the payment. If money left your account, your membership will show here shortly.',
  },
  banner: {
    renewSoon: (date: string, amount: string) => `Your membership ends on ${date}. Renew now for ${amount}.`,
    grace: (date: string, amount: string) => `Your membership has ended. Renew for ${amount} until ${date}.`,
    button: 'Renew',
  },
  becomeMember: {
    badge: (date: string) => `Opens ${date}`,
    badgeOpen: 'Now open',
    heading: 'Become a member',
    body: 'An upgrade on your free account. You keep everything you have now. Nobody has to join.',
    button: 'See membership',
    from: (amount: string) => `From ${amount} a year`,
  },
  loadError: 'Could not load your membership.',
  early: {
    nonMember: (date: string) => `Members book first. Booking opens to everyone on ${date}.`,
    member: (date: string) => `You're booking early. Booking opens to everyone on ${date}.`,
    join: 'Become a member',
  },
  membersOnly: {
    badge: 'Members only',
    locked: 'This ticket is for TRFC members.',
  },
  transfer: {
    button: 'Transfer',
    title: 'Transfer this ticket',
    body: 'Give this ticket to another TRFC account for free. You can do this once per ticket, up to the cancel deadline.',
    emailLabel: "Their TRFC account email",
    emailHelp: 'They need a TRFC account. Members-only tickets can only go to a member.',
    confirm: 'Transfer ticket',
    sending: 'Transferring…',
    done: (name: string) => `Your ticket now belongs to ${name}. We've emailed you both.`,
    from: (name: string) => `Transferred from ${name}`,
  },
  shopDiscount: {
    tag: 'Member discount',
    line: (amount: string) => `Member discount (-${amount})`,
    toggle: (amount: string) => `Use my member discount: ${amount} off marked items`,
    usedNote: 'You have used your member discount for this membership year.',
    statusHeading: 'Shop discount',
    available: (amount: string) => `${amount} off one shop order this membership year. Look for the Member discount tag.`,
    used: (order: string) => `Used on order #${order}. It comes back when your next membership year starts.`,
  },
} as const
