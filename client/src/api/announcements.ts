import api from './index'

export type AnnouncementKind = 'important' | 'news'
export type AnnouncementAudience = 'all' | 'members' | 'free'

export interface Announcement {
  id: string
  title: string
  body: string
  link_url: string | null
  link_label: string | null
  kind: AnnouncementKind
  published_at: string
  read: boolean
}

export const getMyAnnouncements = async (): Promise<{ items: Announcement[]; unread: number }> =>
  (await api.get('/users/me/announcements')).data

/** Without ids, marks everything the user can see as read. */
export const markAnnouncementsRead = async (ids?: string[]): Promise<void> => {
  await api.post('/users/me/announcements/read', ids ? { ids } : {})
}

export const unsubscribeFromNews = async (token: string): Promise<void> => {
  await api.post('/announcements/unsubscribe', { token })
}
