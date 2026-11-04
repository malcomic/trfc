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

/** The Wednesday an order placed now would be delivered. */
export const getDeliveryDatePreview = async (): Promise<{ delivery_date: string }> => {
  const response = await api.get('/orders/delivery-date');
  return response.data;
};

export const DELIVERY_RULE =
  'We deliver on Wednesdays. Orders placed by 8 pm on Tuesday (Nairobi time) arrive that Wednesday; later orders arrive the following Wednesday. Delivery is free.';

export const DELIVERY_RULE_SHORT = 'Free delivery every Wednesday. Order by 8 pm Tuesday to get it this week.';

const dayToLocalDate = (day: string) => {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** "2026-11-04" → "Wednesday, 4 November 2026" without shifting the calendar day across time zones. */
export const formatDeliveryDate = (day: string) =>
  dayToLocalDate(day).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** "2026-11-04" → "Wed, 4 Nov". */
export const formatDeliveryDateShort = (day: string) =>
  dayToLocalDate(day).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' });
