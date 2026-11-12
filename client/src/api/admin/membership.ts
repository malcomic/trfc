import api from '../index'
import type { GuideCategory, MemberGuide, MemberPerk, MemberPoll, MembershipPriceType, PerkStatus } from '../membership'

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

export interface AdminGuide extends MemberGuide {
  sortOrder: number
  isPublished: boolean
  createdAt: string
}

export interface GuideFields {
  title?: string
  description?: string
  category?: GuideCategory
  isPublished?: boolean
}

function guideForm(fields: GuideFields, file?: File | null): FormData {
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) body.append(key, String(value))
  }
  if (file) body.append('file', file)
  return body
}

export const getAdminGuides = async (): Promise<AdminGuide[]> => (await api.get('/admin/membership/guides')).data

export async function uploadGuide(
  fields: Required<Pick<GuideFields, 'title' | 'category'>> & GuideFields,
  file: File,
  onProgress?: (percent: number) => void
): Promise<AdminGuide> {
  const response = await api.post<AdminGuide>('/admin/membership/guides', guideForm(fields, file), {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100))
    },
  })
  return response.data
}

export const updateGuide = async (id: string, fields: GuideFields, file?: File | null): Promise<AdminGuide> =>
  (
    await api.put(`/admin/membership/guides/${id}`, guideForm(fields, file), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  ).data

export const deleteGuide = async (id: string) => (await api.delete(`/admin/membership/guides/${id}`)).data

export const reorderGuides = async (ids: string[]): Promise<AdminGuide[]> =>
  (await api.post('/admin/membership/guides/reorder', { ids })).data

export interface AdminLiveQa {
  on: boolean
  nextAt: string | null
  zoomUrl: string
  title: string
  notes: string
  reminderAt: string | null
  reminderSentAt: string | null
}

export const getAdminLiveQa = async (): Promise<AdminLiveQa> => (await api.get('/admin/membership/live-qa')).data

export const saveLiveQa = async (body: { nextAt: string; zoomUrl: string; title: string; notes: string }): Promise<AdminLiveQa> =>
  (await api.put('/admin/membership/live-qa', body)).data

export interface PollFields {
  question: string
  description: string
  opensAt: string
  closesAt: string
  options: string[]
}

export const getAdminPolls = async (): Promise<MemberPoll[]> => (await api.get('/admin/membership/polls')).data

export const createPoll = async (body: PollFields & { announce: boolean }): Promise<{ poll: MemberPoll | null; announced: boolean }> =>
  (await api.post('/admin/membership/polls', body)).data

export const updatePoll = async (id: string, body: Partial<PollFields>): Promise<MemberPoll> =>
  (await api.put(`/admin/membership/polls/${id}`, body)).data

export const closePoll = async (id: string): Promise<MemberPoll> => (await api.post(`/admin/membership/polls/${id}/close`)).data

export const deletePoll = async (id: string) => (await api.delete(`/admin/membership/polls/${id}`)).data

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
