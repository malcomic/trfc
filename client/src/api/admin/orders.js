import api from '../index';
export const getOrdersForAdmin = async () => {
    const response = await api.get('/orders');
    return response.data;
};
export const getOrderById = async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
};
export const updateOrderStatus = async (id, data) => {
    const response = await api.put(`/orders/${id}`, data);
    return response.data;
};
//# sourceMappingURL=orders.js.map