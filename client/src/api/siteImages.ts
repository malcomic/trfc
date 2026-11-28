import api from './index'

export const FINDER_BODY_SLOTS = [
  'finder_body_women_1',
  'finder_body_women_2',
  'finder_body_women_3',
  'finder_body_women_4',
  'finder_body_women_5',
  'finder_body_men_1',
  'finder_body_men_2',
  'finder_body_men_3',
  'finder_body_men_4',
  'finder_body_men_5',
] as const

export type FinderBodySlot = (typeof FINDER_BODY_SLOTS)[number]

export const FIND_CLIENT_SLOTS = ['find_client_1', 'find_client_2', 'find_client_3'] as const
export type FindClientSlot = (typeof FIND_CLIENT_SLOTS)[number]

export type SiteImageSlot =
  | 'coach'
  | 'program_foundations'
  | 'program_fat_loss'
  | 'program_endurance'
  | 'program_hiking'
  | 'find_results_cover'
  | 'coach_hiring'
  | FinderBodySlot
  | FindClientSlot

export interface SiteImage {
  slot: SiteImageSlot
  image_url: string
  alt_text: string | null
  updated_at: string
  label?: string | null
  bf_min?: number | null
  bf_max?: number | null
  category?: string | null
  quote?: string | null
  client_name?: string | null
  result?: string | null
}

export type SiteImages = Partial<Record<SiteImageSlot, SiteImage>>

export const getSiteImages = async (slots?: SiteImageSlot[]): Promise<SiteImages> => {
  const params = slots?.length ? { slots: slots.join(',') } : undefined
  const data = (await api.get('/site-images', { params })).data
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

export const saveSiteImage = async (
  slot: SiteImageSlot,
  data: {
    image_url: string
    alt_text?: string | null
    bf_min?: number | null
    bf_max?: number | null
    category?: string
    quote?: string
    client_name?: string
    result?: string
  }
): Promise<SiteImage> => (await api.put(`/admin/site-images/${slot}`, data)).data

export const deleteSiteImage = async (slot: SiteImageSlot): Promise<void> => {
  await api.delete(`/admin/site-images/${slot}`)
}
