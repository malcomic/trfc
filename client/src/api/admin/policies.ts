import api from '../index'
import type { PolicySection, PolicySlug } from '../policies'
import type { ConsentHistoryEntry } from '../privacy'

export interface AdminPolicy {
  id: string
  slug: PolicySlug
  version: string
  title: string
  intro: string
  sections: PolicySection[]
  last_updated: string
  is_material: boolean
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface PolicyDraftInput {
  version: string
  title: string
  intro: string
  sections: PolicySection[]
  lastUpdated: string
}

export interface PrivacySettings {
  purchase_retention_months: number
  coach_app_retention_months: number
  coach_file_retention_months_after: number
  account_delete_grace_days: number
  contact_email: string
  contact_phone: string
  show_ticket_photo_notice: boolean
  ticket_photo_notice: string
  show_application_cookie_notice: boolean
  application_cookie_notice: string
  cross_border_notice: string
  box1_text: string
  box2_text: string
  age_box_text: string
  applicant_box_text: string
}

export const getAdminPolicies = async (): Promise<AdminPolicy[]> => {
  const response = await api.get('/admin/policies')
  return response.data
}

export const createPolicyDraft = async (slug: PolicySlug, data: PolicyDraftInput): Promise<{ id: string }> => {
  const response = await api.post('/admin/policies', { slug, ...data })
  return response.data
}

export const updatePolicyDraft = async (id: string, data: PolicyDraftInput): Promise<{ id: string }> => {
  const response = await api.put(`/admin/policies/${id}`, data)
  return response.data
}

export const publishPolicyDraft = async (id: string, isMaterial: boolean) => {
  const response = await api.post(`/admin/policies/${id}/publish`, { isMaterial })
  return response.data as { id: string; slug: PolicySlug; version: string }
}

export const deletePolicyDraft = async (id: string) => {
  const response = await api.delete(`/admin/policies/${id}`)
  return response.data as { ok: true }
}

export const getPrivacySettings = async (): Promise<PrivacySettings> => {
  const response = await api.get('/admin/privacy-settings')
  return response.data
}

export const updatePrivacySettings = async (data: Partial<PrivacySettings>): Promise<PrivacySettings> => {
  const response = await api.put('/admin/privacy-settings', data)
  return response.data
}

export const getUserConsents = async (userId: string): Promise<(ConsentHistoryEntry & { id: string })[]> => {
  const response = await api.get(`/admin/users/${userId}/consents`)
  return response.data
}
