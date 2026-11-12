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

export type GuideCategory = 'grocery' | 'cooking' | 'mindset' | 'workouts'

export interface MemberGuide {
  id: string
  title: string
  description: string
  category: GuideCategory
  fileName: string
  bytes: number
  updatedAt: string
}

export const getMemberGuides = async (): Promise<MemberGuide[]> => (await api.get('/membership/guides')).data

export const getGuideDownloadUrl = async (id: string): Promise<string> =>
  (await api.get<{ url: string }>(`/membership/guides/${id}/download`)).data.url

export interface LiveQa {
  nextAt: string | null
  title: string
  notes: string
  joinOpensAt: string | null
  joinUrl: string | null
  isMember: boolean
}

export const getLiveQa = async (): Promise<LiveQa> => (await api.get('/membership/live-qa')).data

export type PollStatus = 'upcoming' | 'open' | 'closed'

export interface PollOption {
  id: string
  label: string
  votes: number
  percent: number
}

export interface MemberPoll {
  id: string
  question: string
  description: string
  opensAt: string
  closesAt: string
  closedEarlyAt: string | null
  status: PollStatus
  options: PollOption[]
  total: number
  myVote: string | null
}

export const getMemberPolls = async (): Promise<MemberPoll[]> => (await api.get('/membership/polls')).data

export const voteInPoll = async (pollId: string, optionId: string): Promise<MemberPoll | null> =>
  (await api.post(`/membership/polls/${pollId}/vote`, { optionId })).data
