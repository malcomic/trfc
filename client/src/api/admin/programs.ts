import api from '../index'
import type {
  ProgramCardContent,
  ProgramContent,
  ProgramPageContent,
  ProgramPlanContent,
  ProgramWeekContent,
} from '../../types/programContent'

export type ProgramStatus = 'draft' | 'published' | 'archived'

export interface AdminProgramListItem {
  id: string
  slug: string
  name: string
  status: ProgramStatus
  is_core: boolean
  sort_order: number
  updated_at: string
  published_at: string | null
  draft_updated_at: string | null
  week_count: number
  price: number
  enrolled_count: number
}

export interface AdminProgramRow {
  id: string
  slug: string
  name: string
  status: ProgramStatus
  is_core: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AdminProgramEditor {
  program: AdminProgramRow
  content: ProgramContent | null
  hasDraft: boolean
  hasPublished: boolean
  draftUpdatedAt: string | null
  publishedAt: string | null
  enrolledCount: number
}

export interface DraftSaveResult {
  content: ProgramContent
  draftUpdatedAt: string
}

export interface PublishIssue {
  where: string
  message: string
}

export interface PublishCheck {
  hasDraft: boolean
  errors: PublishIssue[]
  warnings: PublishIssue[]
}

export interface ProgramVersion {
  id: string
  state: 'draft' | 'published' | 'superseded'
  created_at: string
  updated_at: string
  published_at: string | null
  week_count: number
  published_by_name: string | null
  updated_by_name: string | null
}

export type DraftSection = 'page' | 'card' | 'plan'
export type SectionValue<S extends DraftSection> = S extends 'page'
  ? ProgramPageContent
  : S extends 'card'
    ? ProgramCardContent
    : ProgramPlanContent

/** expectedUpdatedAt is the draft time the editor last saw, so a stale tab cannot overwrite newer work. */
type Guard = { expectedUpdatedAt: string | null }

const base = (id: string) => `/admin/programs/${encodeURIComponent(id)}`

export const listAdminPrograms = async (): Promise<AdminProgramListItem[]> => {
  const response = await api.get('/admin/programs')
  return Array.isArray(response.data) ? response.data : []
}

export const createAdminProgram = async (body: {
  name: string
  slug?: string
  lengthWeeks?: number
  copyFrom?: string
}): Promise<AdminProgramEditor> => {
  const response = await api.post('/admin/programs', body)
  return response.data
}

export const getAdminProgram = async (id: string): Promise<AdminProgramEditor> => {
  const response = await api.get(base(id))
  return response.data
}

export const saveDraftSection = async <S extends DraftSection>(
  id: string,
  section: S,
  value: SectionValue<S>,
  guard: Guard
): Promise<DraftSaveResult> => {
  const response = await api.put(`${base(id)}/draft/${section}`, { value, ...guard })
  return response.data
}

export const saveDraftWeek = async (
  id: string,
  week: number,
  value: ProgramWeekContent,
  guard: Guard
): Promise<DraftSaveResult> => {
  const response = await api.put(`${base(id)}/draft/weeks/${week}`, { value, ...guard })
  return response.data
}

export const addDraftWeek = async (id: string, copyFrom: number | null, guard: Guard): Promise<DraftSaveResult> => {
  const response = await api.post(`${base(id)}/draft/weeks`, { copyFrom, ...guard })
  return response.data
}

export const removeDraftWeek = async (id: string, week: number, guard: Guard): Promise<DraftSaveResult> => {
  const response = await api.delete(`${base(id)}/draft/weeks/${week}`, { data: guard })
  return response.data
}

export const moveDraftWeek = async (
  id: string,
  week: number,
  direction: 'up' | 'down',
  guard: Guard
): Promise<DraftSaveResult> => {
  const response = await api.post(`${base(id)}/draft/weeks/${week}/move`, { direction, ...guard })
  return response.data
}

export const updateProgramSettings = async (
  id: string,
  body: { name?: string; slug?: string; sortOrder?: number }
): Promise<AdminProgramEditor> => {
  const response = await api.put(`${base(id)}/settings`, body)
  return response.data
}

export const getPublishCheck = async (id: string): Promise<PublishCheck> => {
  const response = await api.get(`${base(id)}/publish-check`)
  return response.data
}

export const publishProgram = async (id: string, acceptWarnings: boolean): Promise<AdminProgramEditor> => {
  const response = await api.post(`${base(id)}/publish`, { acceptWarnings })
  return response.data
}

export const discardDraft = async (id: string): Promise<AdminProgramEditor> => {
  const response = await api.delete(`${base(id)}/draft`)
  return response.data
}

export const archiveProgram = async (id: string): Promise<AdminProgramEditor> => {
  const response = await api.post(`${base(id)}/archive`)
  return response.data
}

export const unarchiveProgram = async (id: string): Promise<AdminProgramEditor> => {
  const response = await api.post(`${base(id)}/unarchive`)
  return response.data
}

export const listProgramVersions = async (id: string): Promise<ProgramVersion[]> => {
  const response = await api.get(`${base(id)}/versions`)
  return Array.isArray(response.data) ? response.data : []
}

export const restoreProgramVersion = async (id: string, versionId: string): Promise<AdminProgramEditor> => {
  const response = await api.post(`${base(id)}/versions/${versionId}/restore`)
  return response.data
}
