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

export const createOrder = async (data: {
  items: any[];
  total_amount: number;
  phone: string;
  email: string;
  delivery_address: string;
  flash_token?: string;
}) => {
  const response = await api.post('/orders', data);
  return response.data;
};

export const updateOrderStatus = async (id: string, data: { payment_status: string; mpesa_receipt?: string }) => {
  const response = await api.put(`/orders/${id}`, data);
  return response.data;
};

/** Wednesday delivery date for clothing in the given products, or null when none of them is clothing. */
export const getDeliveryDatePreview = async (
  productIds: string[]
): Promise<{ has_clothing: boolean; delivery_date: string | null }> => {
  const response = await api.get('/orders/delivery-date', { params: { productIds: productIds.join(',') } });
  return response.data;
};

export const CLOTHING_DELIVERY_RULE =
  'Clothing is delivered on Wednesdays only. Orders placed by 8 pm on Tuesday (Nairobi time) arrive that Wednesday; later orders arrive the following Wednesday.';

/** "2026-11-04" → "Wednesday, 4 November 2026" without shifting the calendar day across time zones. */
export const formatDeliveryDate = (day: string) => {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};
