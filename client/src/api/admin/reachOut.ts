import api from '../index'
import type { ChoiceField, OutreachStatus } from '../../content/signupQuestions'

export type ReachOutFilters = Partial<Record<ChoiceField, string>> & {
  zone?: string
  status?: OutreachStatus
  inactive_days?: number
  has_other?: boolean
  unanswered?: boolean
  search?: string
}

export interface ReachOutMember {
  id: string
  name: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  created_at: string
  last_active_at: string | null
  hardest_now: string | null
  hardest_now_other: string | null
  goal_3m: string | null
  time_with_trfc: string | null
  want_more: string | null
  exercise_frequency: string | null
  zone: string | null
  zone_name: string | null
  outreach_status: OutreachStatus
  events_attended: number
  last_contacted_at: string | null
  last_contacted_by: string | null
  last_note: string | null
}

export interface AnswerCount {
  value: string | null
  label?: string | null
  count: number
}

export interface ReachOutStats {
  total: number
  answered: number
  active_14d: number
  questions: Record<ChoiceField | 'zone', AnswerCount[]>
}

export interface OutreachEntry {
  id: string
  status: OutreachStatus
  note: string | null
  created_at: string
  contacted_by_name: string | null
}

export interface SavedFilter {
  id: string
  name: string
  filters: ReachOutFilters
  count: number
  created_at: string
  created_by_name?: string | null
}

export interface MembersPage {
  members: ReachOutMember[]
  total: number
  page: number
  pageSize: number
}

export async function getReachOutStats(): Promise<ReachOutStats> {
  const response = await api.get<ReachOutStats>('/admin/reach-out/stats')
  return response.data
}

export async function getReachOutMembers(filters: ReachOutFilters, page: number, pageSize = 50): Promise<MembersPage> {
  const response = await api.get<MembersPage>('/admin/reach-out/members', { params: { ...filters, page, pageSize } })
  return response.data
}

export async function getOutreachLog(memberId: string): Promise<OutreachEntry[]> {
  const response = await api.get<OutreachEntry[]>(`/admin/reach-out/members/${memberId}/log`)
  return response.data
}

export async function addOutreachEntry(memberId: string, body: { status: OutreachStatus; note?: string }): Promise<OutreachEntry> {
  const response = await api.post<OutreachEntry>(`/admin/reach-out/members/${memberId}/log`, body)
  return response.data
}

export async function getSavedFilters(): Promise<SavedFilter[]> {
  const response = await api.get<SavedFilter[]>('/admin/reach-out/saved-filters')
  return response.data
}

export async function createSavedFilter(name: string, filters: ReachOutFilters): Promise<SavedFilter> {
  const response = await api.post<SavedFilter>('/admin/reach-out/saved-filters', { name, filters })
  return response.data
}

export async function deleteSavedFilter(id: string): Promise<void> {
  await api.delete(`/admin/reach-out/saved-filters/${id}`)
}

/** Downloads the filtered list as CSV. The server logs every export. */
export async function exportReachOut(filters: ReachOutFilters): Promise<void> {
  const response = await api.get<Blob>('/admin/reach-out/export', { params: filters, responseType: 'blob' })
  const disposition = String(response.headers['content-disposition'] ?? '')
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `reach-out-${new Date().toISOString().slice(0, 10)}.csv`
  const url = window.URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.URL.revokeObjectURL(url)
}
