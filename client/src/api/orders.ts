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
  member_discount?: boolean;
}) => {
  const response = await api.post('/orders', data);
  return response.data;
};

export const updateOrderStatus = async (id: string, data: { payment_status: string; mpesa_receipt?: string }) => {
  const response = await api.put(`/orders/${id}`, data);
  return response.data;
};

export const receiptNumberFor = (orderId: string) => orderId.slice(0, 8).toUpperCase();

/** Downloads the PDF receipt for a paid order. Guests verify with the checkout phone number. */
export const downloadOrderReceipt = async (id: string, phone?: string): Promise<void> => {
  const response = await api.get(`/orders/${id}/receipt.pdf`, {
    responseType: 'blob',
    params: phone ? { phone } : undefined,
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TRFC-receipt-${receiptNumberFor(id)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export interface PublicReceipt {
  receipt_number: string;
  created_at: string;
  payment_status: string;
  items: { name: string; quantity: number; unit_price: number; size: string | null; distance: string | null }[];
  subtotal: number;
  member_discount: number;
  delivery_fee: number;
  total_amount: number;
  mpesa_receipt: string | null;
  collected_at: string | null;
}

export const verifyOrderReceipt = async (
  id: string,
  t: string
): Promise<{ valid: boolean; receipt: PublicReceipt }> => {
  const response = await api.get(`/orders/${id}/verify`, { params: { t } });
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
