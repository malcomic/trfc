import api from './index'

export interface PointsSummary {
  season: { id: string; name: string; startsAt: string; endsAt: string; status: string }
  isCaptain: boolean
  inRace: boolean
  total: number
  overallRank: number | null
  zoneRank: number | null
  gapToNext: number | null
  streak: {
    progress: number
    towardNext: number
    freeMissAvailable: boolean
    streakLength: number
  }
  attendance: { attended: number; official: number; share: number }
  countdowns: {
    raceCutoffAt: string
    anniversaryAt: string
    daysToCutoff: number
    daysToAnniversary: number
  }
  nextSaturday: { id: string; title: string; eventDate: string; points: number } | null
  rewards: {
    balance: number
    referralCode: string
    nearestExpiryAt?: string | null
    referralCount?: number
  }
}

export interface LedgerRow {
  id: string
  points: number
  kind: string
  reason: string | null
  createdAt: string
  eventTitle: string | null
  eventDate: string | null
  scannedBy: string | null
}

export interface Leaderboards {
  overall: Array<{
    rank: number
    userId: string
    name: string
    photoUrl: string | null
    zoneName: string | null
    points: number
  }>
  month: Array<{
    rank: number
    userId: string
    name: string
    photoUrl: string | null
    zoneName: string | null
    points: number
  }>
  zones: Array<{ rank: number; zoneId: string; zoneName: string; members: number; avgPoints: number }>
  referrers: Array<{
    rank: number
    userId: string
    name: string
    photoUrl: string | null
    zoneName: string | null
    referrals: number
  }>
}

export const getMyPoints = async (): Promise<PointsSummary> => {
  const { data } = await api.get('/points/me')
  return data
}

export const getMyPointsLedger = async (limit = 50, offset = 0) => {
  const { data } = await api.get('/points/me/ledger', { params: { limit, offset } })
  return data as { total: number; rows: LedgerRow[] }
}

export const reportMissingScan = async (eventId: string, note?: string) => {
  const { data } = await api.post('/points/me/missing-scan', { eventId, note })
  return data
}

export const getPointsLeaderboards = async (): Promise<Leaderboards> => {
  const { data } = await api.get('/points/leaderboards')
  return data
}

export const submitDispute = async (body: string) => {
  const { data } = await api.post('/points/me/disputes', { body })
  return data
}

export const submitTransformation = async (payload: {
  beforeUrl?: string
  afterUrl?: string
  story: string
  sharePhotos?: boolean
}) => {
  const { data } = await api.post('/points/me/awards/transformation', payload)
  return data
}

export const nominateCommunity = async (nomineeId: string, note?: string) => {
  const { data } = await api.post('/points/me/awards/community-nominate', { nomineeId, note })
  return data
}

export const submitCaptainFeedback = async (rating1: number, rating2: number) => {
  const { data } = await api.post('/points/me/captain-feedback', { rating1, rating2 })
  return data
}

export const redeemRewardPoints = async (points: number, sourceRef?: string) => {
  const { data } = await api.post('/points/me/redeem', { points, sourceRef })
  return data as { points: number; kesValue: number }
}
