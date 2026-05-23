import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
})

export const getAnalyticsSummary = async () => {
  const response = await API.get('/analytics/summary')
  return response.data
}

export const getRevenueTimeline = async (params: { days: string }) => {
  const response = await API.get('/analytics/revenue/timeline', { params })
  return response.data
}

export const getPaymentStats = async () => {
  const response = await API.get('/analytics/payments/stats')
  return response.data
}

export const getTopProducts = async (params: { limit: number }) => {
  const response = await API.get('/analytics/revenue/by-product', { params })
  return response.data
}

export const getTopEvents = async (params: { limit: number }) => {
  const response = await API.get('/analytics/revenue/by-event', { params })
  return response.data
}

export const getUserStats = async () => {
  const response = await API.get('/analytics/users/stats')
  return response.data
}

export const getOrderStats = async () => {
  const response = await API.get('/analytics/orders/stats')
  return response.data
}
