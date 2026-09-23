import api from '../index';

export interface AdminTicketType {
  id: string;
  event_id: string;
  name: string;
  description?: string | null;
  price: number;
  capacity: number | null;
  sort_order: number;
  is_active: boolean;
  remaining: number | null;
  is_sold_out: boolean;
}

export interface AdminEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  event_date: string;
  price?: number;
  capacity?: number;
  image_url?: string;
  is_active: boolean;
  ticket_types?: AdminTicketType[];
  min_price?: number | null;
  all_types_sold_out?: boolean;
}

export const getEventsForAdmin = async (): Promise<AdminEvent[]> => {
  const response = await api.get('/admin/events');
  return response.data;
};

export const createEvent = async (data: {
  title: string;
  description?: string;
  location?: string;
  event_date: string;
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

export const createEventTicketType = async (
  eventId: string,
  data: {
    name: string;
    description?: string | null;
    price: number;
    capacity?: number | null;
    sort_order?: number;
    is_active?: boolean;
  }
) => {
  const response = await api.post<AdminTicketType>(
    `/admin/events/${eventId}/ticket-types`,
    data
  );
  return response.data;
};

export const updateEventTicketType = async (
  eventId: string,
  typeId: string,
  data: {
    name: string;
    description?: string | null;
    price: number;
    capacity?: number | null;
    sort_order?: number;
    is_active?: boolean;
  }
) => {
  const response = await api.put<AdminTicketType>(
    `/admin/events/${eventId}/ticket-types/${typeId}`,
    data
  );
  return response.data;
};

export const deleteEventTicketType = async (eventId: string, typeId: string) => {
  const response = await api.delete(`/admin/events/${eventId}/ticket-types/${typeId}`);
  return response.data;
};
