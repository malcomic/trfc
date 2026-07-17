import api from './index';
import { Event } from '../types';

export const getEvents = async () => {
  const response = await api.get('/events');
  return response.data;
};

export const getEventById = async (id: string) => {
  const response = await api.get(`/events/${id}`);
  return response.data;
};

export const createEvent = async (data: Partial<Event>) => {
  const response = await api.post('/events', data);
  return response.data;
};

export const updateEvent = async (id: string, data: Partial<Event>) => {
  const response = await api.put(`/events/${id}`, data);
  return response.data;
};

export const deleteEvent = async (id: string) => {
  const response = await api.delete(`/events/${id}`);
  return response.data;
};

export const buyEventTickets = async (
  eventId: string,
  data: { quantity: number; email: string; phone: string; attendeeName: string }
) => {
  const response = await api.post(`/events/${eventId}/tickets`, data);
  return response.data as {
    ticketIds: string[];
    purchaseBatchId: string;
    quantity: number;
    eventTitle: string;
    eventDate: string;
    pricePerTicket: number;
    totalPrice: number;
    attendeeName: string;
  };
};

export interface ConfirmationTicket {
  id: string;
  short_code: string;
  attendee_name: string;
  payment_status: string;
  qr_data_url: string | null;
}

export interface TicketConfirmationDetails {
  event_title: string;
  event_date: string;
  location: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  payment_status: string;
  phone: string | null;
  email: string | null;
  attendee_name: string;
  mpesa_receipt: string | null;
  checkout_request_id: string;
  tickets: ConfirmationTicket[];
}

export const getUserTickets = async () => {
  const response = await api.get('/events/tickets/list/user');
  return response.data;
};

export const getTicketsByCheckoutRequestId = async (
  checkoutRequestId: string,
  options: { email?: string; phone?: string }
) => {
  const response = await api.get(`/events/tickets/checkout/${checkoutRequestId}`, {
    params: {
      ...(options.email ? { email: options.email } : {}),
      ...(options.phone ? { phone: options.phone } : {}),
    },
  });
  return response.data as TicketConfirmationDetails;
};
