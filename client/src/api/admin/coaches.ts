import api from '../index'

export type CoachStatus = 'active' | 'suspended'

export interface CoachProgramRef {
  id: string
  slug: string
  name: string
}

export interface AdminCoach {
  userId: string
  name: string
  email: string
  phone: string | null
  status: CoachStatus
  applicationId: string | null
  applicationName: string | null
  activatedAt: string
  createdAt: string
  programs: CoachProgramRef[]
}

export async function listAdminCoaches(): Promise<AdminCoach[]> {
  return (await api.get<{ coaches: AdminCoach[] }>('/admin/coaches')).data.coaches
}

export async function updateCoachStatus(userId: string, status: CoachStatus): Promise<{ userId: string; status: CoachStatus }> {
  return (await api.patch<{ userId: string; status: CoachStatus }>(`/admin/coaches/${userId}`, { status })).data
}

export async function setCoachPrograms(userId: string, programIds: string[]): Promise<CoachProgramRef[]> {
  return (await api.put<{ programs: CoachProgramRef[] }>(`/admin/coaches/${userId}/programs`, { programIds })).data.programs
}
