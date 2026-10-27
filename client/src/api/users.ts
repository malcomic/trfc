import api from './index';
import type { ProgramId } from '../content/programs';

export type StaffRole = 'member' | 'admin' | 'scanner';
export type UserRole = StaffRole | 'captain';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  created_at: string;
  referred_by_captain_id?: string | null;
  referred_by_captain_name?: string | null;
  referred_by_region?: string | null;
  referred_at?: string | null;
  whatsapp?: string | null;
  marketing_opt_in?: boolean;
  welcome_whatsapp_sent_at?: string | null;
  captain_id?: string | null;
  captain_name?: string | null;
  captain_zone?: string | null;
  referred?: boolean;
}

export interface UserListParams {
  search?: string;
  role?: UserRole | '';
  /** A captain's user id, or 'none' for members without a captain. */
  captainId?: string;
}

export interface MemberStats {
  tickets: number;
  upcoming_events: number;
  medals: number;
  orders: number;
  equipment_hires: number;
  pending_payments: number;
  total_spent: number;
  wallet_balance: number;
  active_plans: number;
  saturdays_attended: number;
}

export interface MemberProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string | null;
  marketing_opt_in: boolean | null;
  role: UserRole;
  created_at: string;
}

export interface MemberCaptainSummary {
  name: string;
  zone: string;
  whatsapp: string | null;
}

export interface MemberMembership {
  active: boolean;
  until: string | null;
}

export interface MemberDashboard {
  profile: MemberProfile;
  captain: MemberCaptainSummary | null;
  stats: MemberStats;
  program: { id: ProgramId; enrolled_at: string } | null;
  membership: MemberMembership;
}

export const getMyDashboard = async (): Promise<MemberDashboard> => {
  const response = await api.get('/users/me/dashboard');
  return response.data;
};

export type CalendarStatus = 'going' | 'reserved' | 'pending' | 'attended' | 'missed' | 'none';

export interface CalendarEvent {
  id: string;
  title: string;
  /** Kenya wall-clock time serialized with a trailing Z; read it with UTC getters. */
  event_date: string;
  /** YYYY-MM-DD of the event in Kenya time. */
  event_day: string;
  location: string | null;
  image_url: string | null;
  min_price: number | null;
  sold_out: boolean;
  is_past: boolean;
  my_status: CalendarStatus;
  my_ticket_count: number;
  plan_remaining: number | null;
}

export interface CalendarResponse {
  from: string;
  to: string;
  /** Today's date in Nairobi, YYYY-MM-DD. */
  today: string;
  /** Day of the earliest and latest active events, or null when there are none. */
  earliest: string | null;
  latest: string | null;
  events: CalendarEvent[];
}

export const getMyCalendar = async (from: string, to: string): Promise<CalendarResponse> => {
  const response = await api.get('/users/me/calendar', { params: { from, to } });
  return response.data;
};

export const getAllUsers = async (params?: UserListParams) => {
  const response = await api.get('/users', { params });
  return response.data;
};

export const createUser = async (data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: StaffRole;
}) => {
  const response = await api.post('/users', data);
  return response.data;
};

export const updateUser = async (
  userId: string,
  data: { name: string; email: string; phone: string }
) => {
  const response = await api.put(`/users/${userId}`, data);
  return response.data;
};

export const updateUserRole = async (userId: string, role: StaffRole) => {
  const response = await api.put(`/users/${userId}/role`, { role });
  return response.data;
};

export const resetUserPassword = async (userId: string, password: string) => {
  const response = await api.put(`/users/${userId}/password`, { password });
  return response.data;
};

export const deleteUser = async (userId: string) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};
