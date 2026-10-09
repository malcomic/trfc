import api from './index';

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
}

export interface UserListParams {
  search?: string;
  role?: UserRole | '';
}

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
