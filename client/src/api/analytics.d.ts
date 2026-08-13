export type AnalyticsDateParams = {
    days?: string;
    startDate?: string;
    endDate?: string;
};
export interface MetricTrend {
    trend: 'up' | 'down' | 'neutral';
    trendPercent: number;
}
export interface AnalyticsSummary {
    totalRevenue: number;
    periodRevenue: number;
    thisMonthRevenue: number;
    orderRevenue: number;
    ticketRevenue: number;
    equipmentRevenue: number;
    medalRevenue: number;
    totalOrders: number;
    paidOrders: number;
    paymentSuccessRate: number;
    totalUsers: number;
    avgOrderValue: number;
    trends?: {
        totalRevenue: MetricTrend;
        periodRevenue: MetricTrend;
        totalOrders: MetricTrend;
        paymentSuccessRate: MetricTrend;
        avgOrderValue: MetricTrend;
    };
}
export interface RevenueTimelinePoint {
    date: string;
    revenue: number;
    transactions: number;
    bySource?: {
        shop: number;
        tickets: number;
        hire: number;
        medals: number;
    };
}
export interface PaymentStats {
    total: number;
    successful: number;
    pending: number;
    failed: number;
    successRate: number;
    totalAmount: number;
    avgAmount: number;
    breakdown: Record<string, {
        count: number;
        total: number;
    }>;
}
export interface TopProduct {
    id: string;
    name: string;
    category: string;
    revenue: number;
    quantitySold: number;
    lastSold: string | null;
}
export interface TopEvent {
    id: string;
    name: string;
    capacity: number;
    ticketsSold: number;
    ticketPrice: number;
    revenue: number;
    utilization: string;
    eventDate: string;
}
export interface UserStats {
    total: number;
    inPeriod: number;
    thisMonth: number;
    thisWeek: number;
    byRole: Record<string, number>;
}
export interface OrderStats {
    total: number;
    completed: number;
    pending: number;
    avgValue: number;
    maxValue: number;
    minValue: number;
}
export interface CategoryRevenue {
    category: string;
    revenue: number;
    itemsSold: number;
    orders: number;
}
export interface PaymentTimelinePoint {
    date: string;
    total: number;
    successful: number;
    failed: number;
    pending: number;
}
export interface UserGrowthPoint {
    date: string;
    newUsers: number;
    cumulative: number;
}
export interface EventAttendance {
    id: string;
    name: string;
    capacity: number;
    ticketsSold: number;
    utilization: string;
    eventDate: string;
}
export interface EquipmentStat {
    name: string;
    rentals: number;
    revenue: number;
    avgDurationDays: number;
}
export declare const getAnalyticsSummary: (params?: AnalyticsDateParams) => Promise<AnalyticsSummary>;
export declare const getRevenueTimeline: (params: AnalyticsDateParams) => Promise<RevenueTimelinePoint[]>;
export declare const getPaymentStats: (params?: AnalyticsDateParams) => Promise<PaymentStats>;
export declare const getTopProducts: (params: AnalyticsDateParams & {
    limit: number;
}) => Promise<TopProduct[]>;
export declare const getTopEvents: (params: AnalyticsDateParams & {
    limit: number;
}) => Promise<TopEvent[]>;
export declare const getUserStats: (params?: AnalyticsDateParams) => Promise<UserStats>;
export declare const getOrderStats: (params?: AnalyticsDateParams) => Promise<OrderStats>;
export declare const getEquipmentStats: (params?: AnalyticsDateParams) => Promise<EquipmentStat[]>;
export declare const getEventAttendance: (params?: AnalyticsDateParams) => Promise<EventAttendance[]>;
export declare const getRevenueByCategory: (params?: AnalyticsDateParams) => Promise<CategoryRevenue[]>;
export declare const getPaymentTimeline: (params?: AnalyticsDateParams) => Promise<PaymentTimelinePoint[]>;
export declare const getUserGrowth: (params?: AnalyticsDateParams) => Promise<UserGrowthPoint[]>;
//# sourceMappingURL=analytics.d.ts.map