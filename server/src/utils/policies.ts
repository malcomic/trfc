import { query } from '../config/db.js'
import {
  POLICY_SLUGS,
  PRIVACY_SETTING_DEFAULTS,
  type PolicySection,
  type PolicySlug,
} from '../config/policySeed.js'

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

const DOC_FIELDS = `id, slug, version, title, intro, sections, to_char(last_updated, 'YYYY-MM-DD') AS last_updated,
  is_material, status, published_at`

export function isPolicySlug(value: unknown): value is PolicySlug {
  return typeof value === 'string' && (POLICY_SLUGS as string[]).includes(value)
}

export async function getLatestPolicy(slug: PolicySlug): Promise<PolicyDocument | null> {
  const result = await query(
    `SELECT ${DOC_FIELDS} FROM policy_documents
     WHERE slug = $1 AND status = 'published'
     ORDER BY published_at DESC LIMIT 1`,
    [slug]
  )
  return result.rows[0] ?? null
}

export async function currentPolicyVersion(slug: PolicySlug): Promise<string | null> {
  return (await getLatestPolicy(slug))?.version ?? null
}

export async function listPublishedVersions(slug: PolicySlug) {
  const result = await query(
    `SELECT version, title, to_char(last_updated, 'YYYY-MM-DD') AS last_updated, is_material, published_at
     FROM policy_documents WHERE slug = $1 AND status = 'published'
     ORDER BY published_at DESC`,
    [slug]
  )
  return result.rows
}

export async function getPolicyVersion(slug: PolicySlug, version: string): Promise<PolicyDocument | null> {
  const result = await query(
    `SELECT ${DOC_FIELDS} FROM policy_documents WHERE slug = $1 AND version = $2 AND status = 'published'`,
    [slug, version]
  )
  return result.rows[0] ?? null
}

// ---------- Big-change tracking ----------

const MATERIAL_CACHE_MS = 60_000
let materialCache: { value: Date | null; at: number } | null = null

/** Publish time of the newest big change to the member privacy page or the Terms; agreeing before it means agreeing again. */
export async function latestMaterialChangeAt(): Promise<Date | null> {
  if (materialCache && Date.now() - materialCache.at < MATERIAL_CACHE_MS) return materialCache.value
  const result = await query(
    `SELECT MAX(published_at) AS at FROM policy_documents
     WHERE status = 'published' AND is_material AND slug IN ('privacy-members', 'terms')`
  )
  const at = result.rows[0]?.at ? new Date(result.rows[0].at) : null
  materialCache = { value: at, at: Date.now() }
  return at
}

export function clearMaterialCache() {
  materialCache = null
}

export function needsConsent(
  privacyAcceptedAt: Date | string | null | undefined,
  latestMaterialAt: Date | null
): boolean {
  if (!privacyAcceptedAt) return true
  if (!latestMaterialAt) return false
  return new Date(privacyAcceptedAt).getTime() < latestMaterialAt.getTime()
}

// ---------- Validation for admin edits ----------

const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.\-]{0,19}$/

export interface PolicyDraftInput {
  version: string
  title: string
  intro: string
  sections: PolicySection[]
  lastUpdated: string
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function cleanSections(raw: unknown): PolicySection[] | null {
  if (!Array.isArray(raw)) return null
  const sections: PolicySection[] = []
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object') return null
    const s = item as Record<string, unknown>
    const title = cleanText(s.title, 200)
    if (!title) return null
    const paragraphs = Array.isArray(s.paragraphs)
      ? s.paragraphs.map((p) => cleanText(p, 5000)).filter(Boolean)
      : []
    const section: PolicySection = {
      id: cleanText(s.id, 60).replace(/[^a-z0-9-]/gi, '-').toLowerCase() || `section-${index + 1}`,
      title,
      paragraphs,
    }
    const table = s.table as Record<string, unknown> | undefined
    if (table && Array.isArray(table.headers) && Array.isArray(table.rows)) {
      const headers = table.headers.map((h) => cleanText(h, 200))
      const rows = table.rows
        .filter(Array.isArray)
        .map((row) => (row as unknown[]).slice(0, headers.length).map((c) => cleanText(c, 2000)))
        .filter((row) => row.some(Boolean))
      if (headers.some(Boolean) && rows.length) section.table = { headers, rows }
    }
    sections.push(section)
  }
  return sections
}

export function validatePolicyDraft(body: Record<string, unknown>): { error: string } | PolicyDraftInput {
  const version = cleanText(body.version, 20)
  if (!VERSION_PATTERN.test(version)) return { error: 'Enter a version number, for example 1.1' }
  const title = cleanText(body.title, 200)
  if (!title) return { error: 'Enter a title' }
  const sections = cleanSections(body.sections)
  if (!sections || sections.length === 0) return { error: 'Add at least one section with a title' }
  const lastUpdated = cleanText(body.lastUpdated, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastUpdated) || Number.isNaN(Date.parse(lastUpdated))) {
    return { error: 'Enter the last updated date' }
  }
  return { version, title, intro: cleanText(body.intro, 2000), sections, lastUpdated }
}

// ---------- Privacy settings ----------

export type PrivacySettings = typeof PRIVACY_SETTING_DEFAULTS

const NUMBER_KEYS = new Set([
  'purchase_retention_months',
  'coach_app_retention_months',
  'coach_file_retention_months_after',
  'account_delete_grace_days',
])
const BOOLEAN_KEYS = new Set(['show_ticket_photo_notice', 'show_application_cookie_notice'])

/** Keys safe to show on public pages and forms. */
const PUBLIC_KEYS = [
  'contact_email',
  'contact_phone',
  'show_ticket_photo_notice',
  'ticket_photo_notice',
  'show_application_cookie_notice',
  'application_cookie_notice',
  'cross_border_notice',
  'box1_text',
  'box2_text',
  'age_box_text',
  'applicant_box_text',
  'purchase_retention_months',
  'coach_app_retention_months',
]

export async function getPrivacySettings(): Promise<Record<string, unknown>> {
  const result = await query('SELECT key, value FROM privacy_settings')
  const settings: Record<string, unknown> = { ...PRIVACY_SETTING_DEFAULTS }
  for (const row of result.rows) settings[row.key] = row.value
  return settings
}

export async function getPublicPrivacySettings() {
  const all = await getPrivacySettings()
  return Object.fromEntries(PUBLIC_KEYS.map((key) => [key, all[key]]))
}

export async function getNumberSetting(key: string): Promise<number> {
  const value = (await getPrivacySettings())[key]
  const n = Number(value)
  return Number.isFinite(n) ? n : Number(PRIVACY_SETTING_DEFAULTS[key])
}

export function validatePrivacySettings(body: Record<string, unknown>): { error: string } | Record<string, unknown> {
  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body ?? {})) {
    if (!(key in PRIVACY_SETTING_DEFAULTS)) continue
    if (NUMBER_KEYS.has(key)) {
      const n = Number(value)
      if (!Number.isInteger(n) || n < 1 || n > 120) return { error: `${key.replace(/_/g, ' ')} must be a whole number from 1 to 120` }
      updates[key] = n
    } else if (BOOLEAN_KEYS.has(key)) {
      updates[key] = value === true
    } else {
      if (typeof value !== 'string') return { error: `${key.replace(/_/g, ' ')} must be text` }
      updates[key] = value.trim().slice(0, 2000)
    }
  }
  for (const key of ['box1_text', 'box2_text', 'age_box_text', 'applicant_box_text']) {
    if (key in updates && !updates[key]) return { error: 'Checkbox wording cannot be empty' }
  }
  return updates
}
