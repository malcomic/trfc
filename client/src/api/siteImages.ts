import api from './index'

export type SiteImageSlot =
  | 'coach'
  | 'program_foundations'
  | 'program_fat_loss'
  | 'program_endurance'
  | 'program_hiking'
  | 'find_results_cover'

export interface SiteImage {
  slot: SiteImageSlot
  image_url: string
  alt_text: string | null
  updated_at: string
}

export type SiteImages = Partial<Record<SiteImageSlot, SiteImage>>

export const getSiteImages = async (slots?: SiteImageSlot[]): Promise<SiteImages> => {
  const params = slots?.length ? { slots: slots.join(',') } : undefined
  const data = (await api.get('/site-images', { params })).data
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

export const saveSiteImage = async (
  slot: SiteImageSlot,
  data: { image_url: string; alt_text?: string | null }
): Promise<SiteImage> => (await api.put(`/admin/site-images/${slot}`, data)).data

export const deleteSiteImage = async (slot: SiteImageSlot): Promise<void> => {
  await api.delete(`/admin/site-images/${slot}`)
}
