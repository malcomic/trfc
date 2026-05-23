import api from '../index';

export const getOrdersForAdmin = async () => {
  const response = await api.get('/orders');
  return response.data;
};

export const getOrderById = async (id: string) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

export const updateOrderStatus = async (
  id: string,
  data: { payment_status: string }
) => {
  const response = await api.put(`/orders/${id}`, data);
  return response.data;
};
