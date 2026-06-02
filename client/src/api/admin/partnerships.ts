import api from '../index'

export interface AdminPartnership {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  tier: string
  message?: string
  status: string
  created_at: string
}

export const getPartnershipsForAdmin = async (status?: string): Promise<AdminPartnership[]> => {
  const params = status && status !== 'all' ? { status } : {}
  const response = await api.get('/admin/partnerships', { params })
  return response.data
}

export const updatePartnershipStatus = async (id: string, status: string) => {
  const response = await api.patch(`/admin/partnerships/${id}`, { status })
  return response.data
}
