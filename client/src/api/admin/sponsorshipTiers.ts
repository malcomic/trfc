import api from '../index'
import type { SponsorshipTier } from '../sponsorshipTiers'

export const getSponsorshipTiersForAdmin = async (): Promise<SponsorshipTier[]> => {
  const response = await api.get('/admin/sponsorship-tiers')
  return response.data
}

export const createSponsorshipTier = async (data: {
  slug: string
  name: string
  price_display: string
  benefits: string[]
  icon: string
  sort_order: number
}) => {
  const response = await api.post('/sponsorship-tiers', data)
  return response.data
}

export const updateSponsorshipTier = async (
  id: string,
  data: {
    slug?: string
    name: string
    price_display: string
    benefits: string[]
    icon: string
    sort_order: number
    is_active: boolean
  }
) => {
  const response = await api.put(`/sponsorship-tiers/${id}`, data)
  return response.data
}

export const deleteSponsorshipTier = async (id: string) => {
  const response = await api.delete(`/sponsorship-tiers/${id}`)
  return response.data
}
