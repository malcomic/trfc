import api from '../index'
import type { MemberPerk, MembershipPriceType, PerkStatus } from '../membership'

export type MemberStatusFilter = 'active' | 'expiring' | 'grace' | 'lapsed'

export interface MembershipSummary {
  active: number
  expiring: number
  foundingPaid: number
  foundingHeld: number
  foundingLimit: number
  overLimit: number
  revenueThisYear: number
}

export interface MemberRow {
  user_id: string
  name: string | null
  email: string | null
  phone: string | null
  member_until: string | null
  membership_id: string
  price_type: MembershipPriceType
  amount: number
  starts_at: string
  mpesa_receipt: string | null
  is_founding: boolean
  over_limit: boolean
  years: number
  status: MemberStatusFilter
}

export interface MembersPage {
  rows: MemberRow[]
  total: number
  page: number
  pageSize: number
}

export interface MembersFilters {
  status?: MemberStatusFilter
  type?: MembershipPriceType
  search?: string
}

export interface MembershipYearRow {
  id: string
  price_type: MembershipPriceType
  amount: number
  status: 'paid' | 'cancelled'
  starts_at: string
  ends_at: string
  mpesa_receipt: string | null
  phone: string | null
  note: string | null
  over_limit: boolean
  paid_at: string | null
  cancelled_at: string | null
  granted_by_name: string | null
}

export interface MembershipSettings {
  standardPrice: number
  foundingPrice: number
  foundingLimit: number
  foundingDeadline: string
  renewalPrice: number
  renewalGraceDays: number
  salesOpenAt: string
  salesPaused: boolean
  updatedAt?: string | null
}

export interface PerkUpdate {
  title?: string
  description?: string
  status?: PerkStatus
  icon?: string | null
  linkUrl?: string | null
  buttonLabel?: string | null
  sortOrder?: number
  settings?: Record<string, string | number | boolean | null>
}

export const getMembershipSummary = async (): Promise<MembershipSummary> =>
  (await api.get('/admin/membership/summary')).data

export const getMembers = async (filters: MembersFilters, page: number): Promise<MembersPage> =>
  (await api.get('/admin/membership/members', { params: { ...filters, page } })).data

export const getMemberYears = async (userId: string): Promise<MembershipYearRow[]> =>
  (await api.get(`/admin/membership/members/${userId}/years`)).data

export const grantMembership = async (body: { userId: string; months: number; note: string }) =>
  (await api.post('/admin/membership/grant', body)).data

export const cancelMembershipYear = async (id: string, note: string) =>
  (await api.post(`/admin/membership/${id}/cancel`, { note })).data

export const getMembershipSettings = async (): Promise<MembershipSettings> =>
  (await api.get('/admin/membership/settings')).data

export const saveMembershipSettings = async (body: MembershipSettings): Promise<MembershipSettings> =>
  (await api.put('/admin/membership/settings', body)).data

export const getAdminPerks = async (): Promise<MemberPerk[]> => (await api.get('/admin/membership/perks')).data

export const updatePerk = async (key: string, body: PerkUpdate): Promise<MemberPerk> =>
  (await api.put(`/admin/membership/perks/${encodeURIComponent(key)}`, body)).data

export const reorderPerks = async (keys: string[]): Promise<MemberPerk[]> =>
  (await api.post('/admin/membership/perks/reorder', { keys })).data

export async function exportMembers(filters: MembersFilters): Promise<void> {
  const response = await api.get<Blob>('/admin/membership/members/export', { params: filters, responseType: 'blob' })
  const disposition = String(response.headers['content-disposition'] ?? '')
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `members-${new Date().toISOString().slice(0, 10)}.csv`
  const url = window.URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.URL.revokeObjectURL(url)
}
