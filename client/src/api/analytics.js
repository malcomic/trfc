import api from './index';
function withDateParams(params) {
    return params;
}
export const getAnalyticsSummary = async (params) => {
    const response = await api.get('/analytics/summary', { params: withDateParams(params) });
    return response.data;
};
export const getRevenueTimeline = async (params) => {
    const response = await api.get('/analytics/revenue/timeline', { params });
    return response.data;
};
export const getPaymentStats = async (params) => {
    const response = await api.get('/analytics/payments/stats', { params: withDateParams(params) });
    return response.data;
};
export const getTopProducts = async (params) => {
    const response = await api.get('/analytics/revenue/by-product', { params });
    return response.data;
};
export const getTopEvents = async (params) => {
    const response = await api.get('/analytics/revenue/by-event', { params });
    return response.data;
};
export const getUserStats = async (params) => {
    const response = await api.get('/analytics/users/stats', { params: withDateParams(params) });
    return response.data;
};
export const getOrderStats = async (params) => {
    const response = await api.get('/analytics/orders/stats', { params: withDateParams(params) });
    return response.data;
};
export const getEquipmentStats = async (params) => {
    const response = await api.get('/analytics/equipment/stats', { params: withDateParams(params) });
    return response.data;
};
export const getEventAttendance = async (params) => {
    const response = await api.get('/analytics/events/attendance', { params: withDateParams(params) });
    return response.data;
};
export const getRevenueByCategory = async (params) => {
    const response = await api.get('/analytics/revenue/by-category', { params: withDateParams(params) });
    return response.data;
};
export const getPaymentTimeline = async (params) => {
    const response = await api.get('/analytics/payments/timeline', { params: withDateParams(params) });
    return response.data;
};
export const getUserGrowth = async (params) => {
    const response = await api.get('/analytics/users/growth', { params: withDateParams(params) });
    return response.data;
};
//# sourceMappingURL=analytics.js.map