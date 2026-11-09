import api from '../index'
import type { AnnouncementAudience, AnnouncementKind } from '../announcements'

export interface AnnouncementDraft {
  title: string
  body: string
  link_url: string
  link_label: string
  kind: AnnouncementKind
  audience: AnnouncementAudience
  send_email: boolean
}

export interface AdminAnnouncement {
  id: string
  title: string
  body: string
  link_url: string | null
  link_label: string | null
  kind: AnnouncementKind
  audience: AnnouncementAudience
  send_email: boolean
  published_at: string
  archived_at: string | null
  created_by_name: string | null
  reads: number
  emails_sent: number
  emails_failed: number
  emails_pending: number
  emails_total: number
}

export interface RecipientCount {
  dashboard: number
  email: number
  minutes: number
}

export const getAnnouncements = async (): Promise<AdminAnnouncement[]> =>
  (await api.get('/admin/announcements')).data

export const createAnnouncement = async (
  draft: AnnouncementDraft
): Promise<{ announcement: AdminAnnouncement; queued: number }> =>
  (await api.post('/admin/announcements', draft)).data

export const getRecipientCount = async (params: {
  audience: AnnouncementAudience
  kind: AnnouncementKind
  sendEmail: boolean
}): Promise<RecipientCount> =>
  (await api.get('/admin/announcements/recipient-count', { params })).data

export const sendTestAnnouncement = async (draft: AnnouncementDraft): Promise<{ sentTo: string }> =>
  (await api.post('/admin/announcements/test-email', draft)).data

export const archiveAnnouncement = async (id: string): Promise<AdminAnnouncement> =>
  (await api.post(`/admin/announcements/${id}/archive`)).data
