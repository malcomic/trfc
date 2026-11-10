import api from '../index'

export const HIRING_STATUSES = ['new', 'reviewing', 'call_booked', 'accepted', 'not_now'] as const
export type HiringStatus = (typeof HIRING_STATUSES)[number]

export const HIRING_STATUS_LABELS: Record<HiringStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  call_booked: 'Call booked',
  accepted: 'Accepted',
  not_now: 'Not now',
}

export interface HiringFilters {
  status?: HiringStatus
  q?: string
  hours?: 'morning' | 'afternoon' | 'evening'
  threeHours?: 'yes' | 'no'
  from?: string
  to?: string
}

export interface CoachApplication {
  id: string
  full_name: string
  phone: string
  email: string
  location: string
  social_url: string
  experience: string
  can_give_3_hours: boolean
  hours: string[]
  worked_harder: string
  answers: Record<string, unknown>
  video_url: string
  video_source: 'upload' | 'link'
  cv_url: string | null
  cv_file_name: string | null
  status: HiringStatus
  handled_by: string | null
  handled_by_name: string | null
  notes: string | null
  status_changed_at: string | null
  agreed_standards_at: string
  agreed_storage_at: string
  created_at: string
  updated_at: string
}

export interface ApplicationsPage {
  rows: CoachApplication[]
  total: number
  page: number
  pageSize: number
  counts: Record<HiringStatus | 'all', number>
}

export interface AdminOption {
  id: string
  name: string | null
  email: string
}

export interface HiringSettings {
  notifyUserId: string | null
  admins: AdminOption[]
}

export async function getApplications(filters: HiringFilters, page: number): Promise<ApplicationsPage> {
  return (await api.get<ApplicationsPage>('/admin/hiring', { params: { ...filters, page } })).data
}

export async function getApplication(id: string): Promise<CoachApplication> {
  return (await api.get<CoachApplication>(`/admin/hiring/${id}`)).data
}

export async function updateApplication(
  id: string,
  body: { status?: HiringStatus; notes?: string | null; handledBy?: string | null }
): Promise<CoachApplication> {
  return (await api.patch<CoachApplication>(`/admin/hiring/${id}`, body)).data
}

export async function getHiringSettings(): Promise<HiringSettings> {
  return (await api.get<HiringSettings>('/admin/hiring/settings')).data
}

export async function saveHiringSettings(notifyUserId: string | null): Promise<HiringSettings> {
  return (await api.put<HiringSettings>('/admin/hiring/settings', { notifyUserId })).data
}

export async function exportApplications(filters: HiringFilters): Promise<void> {
  const response = await api.get<Blob>('/admin/hiring/export', { params: filters, responseType: 'blob' })
  const disposition = String(response.headers['content-disposition'] ?? '')
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `coach-applications-${new Date().toISOString().slice(0, 10)}.csv`
  const url = window.URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.URL.revokeObjectURL(url)
}
