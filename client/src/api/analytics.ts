import api from './index'

export type AnalyticsDateParams = { days?: string; startDate?: string; endDate?: string }

export interface MetricTrend {
  trend: 'up' | 'down' | 'neutral'
  trendPercent: number
}

export interface AnalyticsSummary {
  totalRevenue: number
  periodRevenue: number
  thisMonthRevenue: number
  orderRevenue: number
  ticketRevenue: number
  equipmentRevenue: number
  medalRevenue: number
  totalOrders: number
  paidOrders: number
  paymentSuccessRate: number
  totalUsers: number
  avgOrderValue: number
  trends?: {
    totalRevenue: MetricTrend
    periodRevenue: MetricTrend
    totalOrders: MetricTrend
    paymentSuccessRate: MetricTrend
    avgOrderValue: MetricTrend
  }
}

export interface RevenueTimelinePoint {
  date: string
  revenue: number
  transactions: number
  bySource?: { shop: number; tickets: number; hire: number; medals: number }
}

export interface PaymentStats {
  total: number
  successful: number
  pending: number
  failed: number
  successRate: number
  totalAmount: number
  avgAmount: number
  breakdown: Record<string, { count: number; total: number }>
}

export interface TopProduct {
  id: string
  name: string
  category: string
  revenue: number
  quantitySold: number
  lastSold: string | null
}

export interface TopEvent {
  id: string
  name: string
  capacity: number
  ticketsSold: number
  ticketPrice: number
  revenue: number
  utilization: string
  eventDate: string
}

export interface UserStats {
  total: number
  inPeriod: number
  thisMonth: number
  thisWeek: number
  byRole: Record<string, number>
}

export interface OrderStats {
  total: number
  completed: number
  pending: number
  avgValue: number
  maxValue: number
  minValue: number
}

export interface CategoryRevenue {
  category: string
  revenue: number
  itemsSold: number
  orders: number
}

export interface PaymentTimelinePoint {
  date: string
  total: number
  successful: number
  failed: number
  pending: number
}

export interface UserGrowthPoint {
  date: string
  newUsers: number
  cumulative: number
}

export interface EventAttendance {
  id: string
  name: string
  capacity: number
  ticketsSold: number
  utilization: string
  eventDate: string
}

export interface EquipmentStat {
  name: string
  rentals: number
  revenue: number
  avgDurationDays: number
}

function withDateParams(params?: AnalyticsDateParams & Record<string, string | number>) {
  return params
}

export const getAnalyticsSummary = async (params?: AnalyticsDateParams): Promise<AnalyticsSummary> => {
  const response = await api.get('/analytics/summary', { params: withDateParams(params) })
  return response.data
}

export const getRevenueTimeline = async (
  params: AnalyticsDateParams
): Promise<RevenueTimelinePoint[]> => {
  const response = await api.get('/analytics/revenue/timeline', { params })
  return response.data
}

export const getPaymentStats = async (params?: AnalyticsDateParams): Promise<PaymentStats> => {
  const response = await api.get('/analytics/payments/stats', { params: withDateParams(params) })
  return response.data
}

export const getTopProducts = async (
  params: AnalyticsDateParams & { limit: number }
): Promise<TopProduct[]> => {
  const response = await api.get('/analytics/revenue/by-product', { params })
  return response.data
}

export const getTopEvents = async (
  params: AnalyticsDateParams & { limit: number }
): Promise<TopEvent[]> => {
  const response = await api.get('/analytics/revenue/by-event', { params })
  return response.data
}

export const getUserStats = async (params?: AnalyticsDateParams): Promise<UserStats> => {
  const response = await api.get('/analytics/users/stats', { params: withDateParams(params) })
  return response.data
}

export const getOrderStats = async (params?: AnalyticsDateParams): Promise<OrderStats> => {
  const response = await api.get('/analytics/orders/stats', { params: withDateParams(params) })
  return response.data
}

export const getEquipmentStats = async (params?: AnalyticsDateParams): Promise<EquipmentStat[]> => {
  const response = await api.get('/analytics/equipment/stats', { params: withDateParams(params) })
  return response.data
}

export const getEventAttendance = async (params?: AnalyticsDateParams): Promise<EventAttendance[]> => {
  const response = await api.get('/analytics/events/attendance', { params: withDateParams(params) })
  return response.data
}

export const getRevenueByCategory = async (
  params?: AnalyticsDateParams
): Promise<CategoryRevenue[]> => {
  const response = await api.get('/analytics/revenue/by-category', { params: withDateParams(params) })
  return response.data
}

export const getPaymentTimeline = async (
  params?: AnalyticsDateParams
): Promise<PaymentTimelinePoint[]> => {
  const response = await api.get('/analytics/payments/timeline', { params: withDateParams(params) })
  return response.data
}

export const getUserGrowth = async (params?: AnalyticsDateParams): Promise<UserGrowthPoint[]> => {
  const response = await api.get('/analytics/users/growth', { params: withDateParams(params) })
  return response.data
}
