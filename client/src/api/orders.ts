import api from './index';

export const getOrders = async () => {
  const response = await api.get('/orders');
  return response.data;
};

export const getOrderById = async (id: string, phone?: string) => {
  const params = phone ? { phone } : undefined;
  const response = await api.get(`/orders/${id}`, { params });
  return response.data;
};

export const createOrder = async (data: { items: any[]; total_amount: number; phone: string; delivery_address: string }) => {
  const response = await api.post('/orders', data);
  return response.data;
};

export const updateOrderStatus = async (id: string, data: { payment_status: string; mpesa_receipt?: string }) => {
  const response = await api.put(`/orders/${id}`, data);
  return response.data;
};
