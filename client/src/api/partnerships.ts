import api from './index'

export interface PartnershipSubmission {
  company_name: string
  contact_person: string
  email: string
  phone: string
  tier: string
  message?: string
}

export const submitPartnership = async (data: PartnershipSubmission) => {
  const response = await api.post('/partnerships', data)
  return response.data
}
