import api from './index'

export type PerkStatus = 'on' | 'coming_soon' | 'hidden'
export type MembershipPriceType = 'founding' | 'standard' | 'renewal' | 'gift'

export interface MemberPerk {
  key: string
  title: string
  description: string
  status: PerkStatus
  sortOrder: number
  icon: string | null
  linkUrl: string | null
  buttonLabel: string | null
  settings: Record<string, string | number | boolean | null>
}

export interface MembershipQuote {
  available: boolean
  reason?: 'opens' | 'paused'
  priceType: Exclude<MembershipPriceType, 'gift'>
  amount: number
  startsAt: string
  endsAt: string
  foundingLeft: number
  renewalUntil: string | null
}

export interface MembershipYear {
  id: string
  priceType: MembershipPriceType
  amount: number
  status: 'paid' | 'cancelled' | 'pending' | 'failed'
  startsAt: string
  endsAt: string
  receipt: string | null
  paidAt: string | null
}

export interface MyMembership {
  active: boolean
  until: string | null
  isFounding: boolean
  renewalUntil: string | null
  current: MembershipYear | null
  history: MembershipYear[]
  pending: { checkoutRequestId: string; amount: number } | null
  quote: MembershipQuote
  founding: { limit: number; left: number; deadline: string }
  salesOpenAt: string
  phone: string | null
  perks: MemberPerk[]
}

export interface PublicPerks {
  perks: MemberPerk[]
  price: {
    standard: number
    founding: number
    renewal: number
    foundingLeft: number
    foundingLimit: number
    foundingDeadline: string
    salesOpenAt: string
    available: boolean
    reason: 'opens' | 'paused' | null
  }
}

export interface MembershipCheckout {
  checkoutRequestId: string
  membershipId: string
  amount: number
  priceType: string
  reused: boolean
}

export const getMyMembership = async (): Promise<MyMembership> => (await api.get('/membership/me')).data

export const startMembershipCheckout = async (phone: string): Promise<MembershipCheckout> =>
  (await api.post('/membership/checkout', { phone })).data

export const getMemberPerks = async (): Promise<PublicPerks> => (await api.get('/membership/perks')).data

export interface ShopDiscount {
  available: boolean
  amount: number
  isMember: boolean
  usedOrderId: string | null
}

export const getShopDiscount = async (): Promise<ShopDiscount> => (await api.get('/membership/shop-discount')).data

export interface TicketTransferResult {
  ticketId: string
  recipientName: string
  eventTitle: string
}

export const transferTicket = async (ticketId: string, email: string): Promise<TicketTransferResult> =>
  (await api.post(`/events/tickets/${ticketId}/transfer`, { email })).data
