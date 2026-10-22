import api from './index';
import type { User } from '../types';

export const registerUser = async (data: {
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  password: string;
  referralCode?: string;
  captainId?: string;
  marketingOptIn?: boolean;
}) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const loginUser = async (data: { email: string; password: string }) => {
  const response = await api.post('/auth/login', data);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const refreshToken = async (refreshToken: string) => {
  const response = await api.post('/auth/refresh', { refreshToken });
  return response.data;
};

export const requestPasswordReset = async (email: string): Promise<{ message: string }> => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token: string, password: string): Promise<{ message: string }> => {
  const response = await api.post('/auth/reset-password', { token, password });
  return response.data;
};

export const getUserProfile = async () => {
  const response = await api.get('/auth/me');
  return response.data.user;
};

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export const updateMyProfile = async (data: {
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  marketingOptIn?: boolean;
}): Promise<AuthTokens & { user: User }> => {
  const response = await api.put('/auth/me', data);
  return response.data;
};

export const changeMyPassword = async (data: {
  currentPassword: string;
  newPassword: string;
}): Promise<AuthTokens & { message: string }> => {
  const response = await api.put('/auth/me/password', data);
  return response.data;
};
