import api from './index';
export const getOrders = async () => {
    const response = await api.get('/orders');
    return response.data;
};
export const getOrderById = async (id, phone) => {
    const params = phone ? { phone } : undefined;
    const response = await api.get(`/orders/${id}`, { params });
    return response.data;
};
export const createOrder = async (data) => {
    const response = await api.post('/orders', data);
    return response.data;
};
export const updateOrderStatus = async (id, data) => {
    const response = await api.put(`/orders/${id}`, data);
    return response.data;
};
//# sourceMappingURL=orders.js.map