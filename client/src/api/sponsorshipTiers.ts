import api from './index'

export interface SponsorshipTier {
  id: string
  slug: string
  name: string
  price_display: string
  benefits: string[]
  icon: string
  sort_order: number
  is_active: boolean
  created_at?: string
}

export const getSponsorshipTiers = async (): Promise<SponsorshipTier[]> => {
  const response = await api.get('/sponsorship-tiers')
  return response.data
}
