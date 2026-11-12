import api from './index'

export type PolicySlug = 'privacy-members' | 'privacy-applicants' | 'terms'

export interface PolicyTable {
  headers: string[]
  rows: string[][]
}

export interface PolicySection {
  id: string
  title: string
  paragraphs: string[]
  table?: PolicyTable
}

export interface PolicyDocument {
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
}

export interface PolicyVersionSummary {
  version: string
  title: string
  last_updated: string
  is_material: boolean
  published_at: string
}

export interface PublicPrivacySettings {
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
  purchase_retention_months: number
  coach_app_retention_months: number
}

export const POLICY_PATHS: Record<PolicySlug, string> = {
  'privacy-members': '/privacy',
  'privacy-applicants': '/privacy/applicants',
  terms: '/terms',
}

export async function getPolicy(slug: PolicySlug): Promise<PolicyDocument> {
  const response = await api.get(`/policies/${slug}`)
  return response.data
}

export async function getPolicyVersions(slug: PolicySlug): Promise<PolicyVersionSummary[]> {
  const response = await api.get(`/policies/${slug}/versions`)
  return response.data
}

export async function getPolicyAtVersion(slug: PolicySlug, version: string): Promise<PolicyDocument> {
  const response = await api.get(`/policies/${slug}/versions/${encodeURIComponent(version)}`)
  return response.data
}

let settingsPromise: Promise<PublicPrivacySettings> | null = null

/** Checkbox wording and notices; cached for the page session. */
export function getPublicPrivacySettings(): Promise<PublicPrivacySettings> {
  if (!settingsPromise) {
    settingsPromise = api
      .get('/policies/settings')
      .then((response) => response.data)
      .catch((error) => {
        settingsPromise = null
        throw error
      })
  }
  return settingsPromise
}

export function formatPolicyDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
}
