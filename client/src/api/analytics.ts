import api from './index'

export const getAnalyticsSummary = async () => {
  const response = await api.get('/analytics/summary')
  return response.data
}

export const getRevenueTimeline = async (params: { days: string }) => {
  const response = await api.get('/analytics/revenue/timeline', { params })
  return response.data
}

export const getPaymentStats = async () => {
  const response = await api.get('/analytics/payments/stats')
  return response.data
}

export const getTopProducts = async (params: { limit: number }) => {
  const response = await api.get('/analytics/revenue/by-product', { params })
  return response.data
}

export const getTopEvents = async (params: { limit: number }) => {
  const response = await api.get('/analytics/revenue/by-event', { params })
  return response.data
}

export const getUserStats = async () => {
  const response = await api.get('/analytics/users/stats')
  return response.data
}

export const getOrderStats = async () => {
  const response = await api.get('/analytics/orders/stats')
  return response.data
}

export const getEquipmentStats = async () => {
  const response = await api.get('/analytics/equipment/stats')
  return response.data
}

export const getEventAttendance = async () => {
  const response = await api.get('/analytics/events/attendance')
  return response.data
}
