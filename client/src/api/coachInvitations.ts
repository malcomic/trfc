import api from './index'

export interface CoachInvitePreview {
  fullName: string
  email: string
  phone: string
  expiresAt: string
}

export async function validateCoachInvite(token: string): Promise<CoachInvitePreview> {
  return (await api.get<CoachInvitePreview>('/coach-invitations/validate', { params: { token } })).data
}

export async function activateCoachInvite(body: {
  token: string
  password: string
  phone: string
  acceptTerms: boolean
  policyVersion: string
}): Promise<{ ok: true; email: string; name: string }> {
  return (await api.post<{ ok: true; email: string; name: string }>('/coach-invitations/activate', body)).data
}
