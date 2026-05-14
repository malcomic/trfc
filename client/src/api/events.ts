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
