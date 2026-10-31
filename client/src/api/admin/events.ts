import api from '../index';
import type { SeatBreakdown } from '../../types';

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
  installments_allowed?: number;
  payment_deadline_days?: number | null;
  member_priority_pct?: number | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  scan_list_confirmed_at?: string | null;
  zones?: { id: string; name: string }[];
  seat_breakdown?: SeatBreakdown | null;
  /** People on the waiting list who haven't been told about a seat yet. */
  waitlist_count?: number;
}

export interface WaitlistEntry {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  has_account: boolean;
  created_at: string;
  notified_at: string | null;
}

export const getEventWaitlist = async (id: string): Promise<WaitlistEntry[]> =>
  (await api.get(`/admin/events/${id}/waitlist`)).data;

/** Settings shared by create and update. Empty number fields are sent as null (use the default / no limit). */
export interface EventSettingsInput {
  installments_enabled?: boolean;
  payment_deadline_days?: number | null;
  member_priority_pct?: number | null;
  capacity?: number | null;
  zone_ids?: string[];
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
} & EventSettingsInput) => {
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
  } & EventSettingsInput
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

/** TRFC cancels the event: every ticket becomes ticket value straight away and is never a no-show. */
export const cancelEventByTrfc = async (id: string, reason: string) =>
  (await api.post(`/admin/events/${id}/cancel`, { reason })).data as {
    plansClosed: number;
    ticketsCredited: number;
    guestTickets: number;
  };

/** One zone's share. Preview lines are camelCase; saved lines are snake_case. */
export interface SettlementLine {
  regionId?: string;
  region_id?: string;
  regionName?: string;
  region_name?: string;
  leadCaptainName?: string | null;
  /** Captain on a line settled before shares moved to zones. */
  captain_name?: string | null;
  usedTickets?: number;
  used_tickets?: number;
  amount: number;
  commission_status?: string | null;
}

export interface SettlementBreakdown {
  revenue: number;
  costs: number;
  grossProfit: number;
  pct: number;
  usedCount: number;
  perTicketValue: number;
  captainPool: number;
  lines: SettlementLine[];
}

export interface SavedSettlement {
  revenue: number;
  costs: number;
  gross_profit: number;
  pct: number;
  used_count: number;
  per_ticket_value: number;
  captain_pool: number;
  approved_at: string;
  approved_by_name: string | null;
  /** Captains are paid by M-Pesa by this date (7 days after the event). */
  payout_due: string;
  lines: SettlementLine[];
}

export interface EventSettlementView {
  event: { id: string; title: string; starts_at: string; cancelled: boolean };
  enabled: boolean;
  costs: { id: string; label: string; amount: number; created_at: string }[];
  preview: SettlementBreakdown | null;
  settlement: SavedSettlement | null;
}

export const getEventSettlement = async (id: string): Promise<EventSettlementView> =>
  (await api.get(`/admin/events/${id}/settlement`)).data;

export const addEventCost = async (id: string, data: { label: string; amount: number }) =>
  (await api.post(`/admin/events/${id}/costs`, data)).data;

export const removeEventCost = async (id: string, costId: string) =>
  (await api.delete(`/admin/events/${id}/costs/${costId}`)).data;

export const approveEventSettlement = async (id: string): Promise<EventSettlementView> =>
  (await api.post(`/admin/events/${id}/settlement/approve`)).data;
