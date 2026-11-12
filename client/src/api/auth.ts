import api from './index';
import type { User } from '../types';
import type { SignupAnswers } from '../content/signupQuestions';

export const registerUser = async (data: {
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  password: string;
  referralCode?: string;
  captainId?: string;
  marketingOptIn?: boolean;
  answers?: Partial<SignupAnswers>;
} & SignupConsent): Promise<AuthTokens & { user: User; answersSaved?: boolean; linked_purchases?: number }> => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const loginUser = async (data: {
  email: string;
  password: string;
}): Promise<AuthTokens & { user: User; linked_purchases?: number }> => {
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

export interface GoogleSignupProfile {
  name: string;
  email: string;
  picture: string | null;
}

export type GoogleAuthResponse =
  | (AuthTokens & { user: User; linked_purchases?: number; needsProfile?: undefined })
  | { needsProfile: true; signupToken: string; profile: GoogleSignupProfile };

export const googleAuth = async (credential: string): Promise<GoogleAuthResponse> => {
  const response = await api.post('/auth/google', { credential });
  return response.data;
};

export const completeGoogleSignup = async (data: {
  signupToken: string;
  phone: string;
  whatsapp?: string;
  referralCode?: string;
  captainId?: string;
  marketingOptIn?: boolean;
  answers?: Partial<SignupAnswers>;
} & SignupConsent): Promise<AuthTokens & { user: User; answersSaved?: boolean; linked_purchases?: number }> => {
  const response = await api.post('/auth/google/complete', data);
  return response.data;
};

export const linkGoogle = async (credential: string): Promise<{ user: User }> => {
  const response = await api.post('/auth/me/google', { credential });
  return response.data;
};

export const unlinkGoogle = async (): Promise<{ user: User }> => {
  const response = await api.delete('/auth/me/google');
  return response.data;
};

export const changeMyPassword = async (data: {
  currentPassword: string;
  newPassword: string;
}): Promise<AuthTokens & { message: string }> => {
  const response = await api.put('/auth/me/password', data);
  return response.data;
};

/** Box 1, the age box and the policy version shown, as sent on sign-up and on the agree-again prompt. */
export interface SignupConsent {
  acceptTerms: boolean;
  ageConfirmed: boolean;
  policyVersion: string;
}

export interface ConsentStatus {
  needs_consent: boolean;
  needs_marketing_prompt: boolean;
  privacy_version: string | null;
}

export const acceptConsent = async (
  data: Partial<SignupConsent> & { marketingOptIn?: boolean }
): Promise<ConsentStatus & { ok: true }> => {
  const response = await api.post('/auth/consent', data);
  return response.data;
};
