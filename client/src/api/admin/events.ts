import api from '../index';

export const getEventsForAdmin = async () => {
  const response = await api.get('/events');
  return response.data;
};

export const createEvent = async (data: {
  title: string;
  description?: string;
  location?: string;
  event_date: string;
  price: number;
  capacity?: number;
  image_url?: string;
}) => {
  const response = await api.post('/events', data);
  return response.data;
};

export const updateEvent = async (
  id: string,
  data: {
    title: string;
    description?: string;
    location?: string;
    event_date: string;
    price: number;
    capacity?: number;
    image_url?: string;
    is_active: boolean;
  }
) => {
  const response = await api.put(`/events/${id}`, data);
  return response.data;
};

export const deleteEvent = async (id: string) => {
  const response = await api.delete(`/events/${id}`);
  return response.data;
};
