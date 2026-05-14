import api from './index';

export const getAllUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const updateUserRole = async (userId: string, role: 'member' | 'admin') => {
  const response = await api.put(`/users/${userId}/role`, { role });
  return response.data;
};
