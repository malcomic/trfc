import api from './index'
import { initiateSTKPush } from './payments'

export const getAvailableEquipment = async () => {
  const response = await api.get('/equipment/available/packages')
  return response.data
}

export const createEquipmentHireRequest = async (data: {
  equipmentName: string
  packageType: string
  hireDate: string
  returnDate: string
  phone: string
}) => {
  const response = await api.post('/equipment/hire', data)
  return response.data
}

export const getEquipmentHireById = async (id: string, phone?: string) => {
  const params = phone ? { phone } : undefined
  const response = await api.get(`/equipment/hire/${id}`, { params })
  return response.data
}

export const initiateEquipmentPayment = async (data: {
  phone: string
  amount: number
  equipmentHireId: string
}) => {
  return initiateSTKPush({
    phone: data.phone,
    amount: data.amount,
    equipmentHireId: data.equipmentHireId,
  })
}
