import api from '../index'

export interface AdminEquipmentHire {
  id: string
  equipment_name: string
  phone?: string
  hire_date: string
  return_date: string
  total_cost: number
  payment_status: string
  status?: string
  created_at: string
}

export const getEquipmentHireForAdmin = async (status?: string): Promise<AdminEquipmentHire[]> => {
  const params = status && status !== 'all' ? { status } : {}
  const response = await api.get('/admin/equipment/hire', { params })
  return response.data
}
