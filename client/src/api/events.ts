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
  data: { quantity: number; phone: string }
) => {
  const response = await api.post(`/events/${eventId}/tickets`, data);
  return response.data as {
    ticketIds: string[];
    quantity: number;
    eventTitle: string;
    eventDate: string;
    pricePerTicket: number;
    totalPrice: number;
  };
};

export const getUserTickets = async () => {
  const response = await api.get('/events/tickets/list/user');
  return response.data;
};
