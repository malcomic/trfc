export const GUIDE_CATEGORIES = ['grocery', 'cooking', 'mindset', 'workouts'] as const
export type GuideCategory = (typeof GUIDE_CATEGORIES)[number]

export const MAX_GUIDE_BYTES = 25 * 1024 * 1024
export const GUIDE_FOLDER = 'trfc/member-guides'
export const GUIDE_TITLE_MAX = 160
export const GUIDE_DESCRIPTION_MAX = 1000
export const GUIDE_TYPE_ERROR = 'Upload the guide as a PDF file'
export const GUIDE_SIZE_ERROR = 'The PDF must be 25 MB or smaller'

/** Checks the file contents, not just the name or browser-reported type. */
export function isPdf(buffer: Buffer | null | undefined): boolean {
  return Boolean(buffer && buffer.length >= 8 && buffer.subarray(0, 5).toString('latin1') === '%PDF-')
}

export function isGuideCategory(value: unknown): value is GuideCategory {
  return typeof value === 'string' && (GUIDE_CATEGORIES as readonly string[]).includes(value)
}

/** Keeps a readable download name: letters, numbers, spaces, dashes and dots, ending in .pdf. */
export function cleanGuideFileName(name: unknown, fallbackTitle: string): string {
  const raw = typeof name === 'string' && name.trim() ? name.trim() : fallbackTitle
  const base = raw.replace(/\.pdf$/i, '').replace(/[^\w .-]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 150)
  return `${base || 'guide'}.pdf`
}

export interface GuideInput {
  title: string
  description: string
  category: GuideCategory
}

export interface GuideUpdate {
  title?: string
  description?: string
  category?: GuideCategory
  isPublished?: boolean
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

function parseTitle(value: unknown): Parsed<string> {
  const title = typeof value === 'string' ? value.trim() : ''
  if (!title) return { ok: false, error: 'Give the guide a title' }
  if (title.length > GUIDE_TITLE_MAX) return { ok: false, error: `Keep the title under ${GUIDE_TITLE_MAX} characters` }
  return { ok: true, value: title }
}

function parseDescription(value: unknown): Parsed<string> {
  const description = typeof value === 'string' ? value.trim() : ''
  if (description.length > GUIDE_DESCRIPTION_MAX) {
    return { ok: false, error: `Keep the description under ${GUIDE_DESCRIPTION_MAX} characters` }
  }
  return { ok: true, value: description }
}

export function parseGuideInput(body: any): Parsed<GuideInput> {
  const title = parseTitle(body?.title)
  if (!title.ok) return title
  const description = parseDescription(body?.description)
  if (!description.ok) return description
  if (!isGuideCategory(body?.category)) return { ok: false, error: 'Pick a category' }
  return { ok: true, value: { title: title.value, description: description.value, category: body.category } }
}

/** Multipart forms send booleans as strings, so "true" and "false" are accepted too. */
function parseBool(value: unknown): boolean | undefined {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return undefined
}

export function parseGuideUpdate(body: any): Parsed<GuideUpdate> {
  const value: GuideUpdate = {}
  if (body?.title !== undefined) {
    const title = parseTitle(body.title)
    if (!title.ok) return title
    value.title = title.value
  }
  if (body?.description !== undefined) {
    const description = parseDescription(body.description)
    if (!description.ok) return description
    value.description = description.value
  }
  if (body?.category !== undefined) {
    if (!isGuideCategory(body.category)) return { ok: false, error: 'Pick a category' }
    value.category = body.category
  }
  if (body?.isPublished !== undefined) {
    const published = parseBool(body.isPublished)
    if (published === undefined) return { ok: false, error: 'Published must be true or false' }
    value.isPublished = published
  }
  return { ok: true, value }
}

/** What members see: never the storage id. */
export function memberGuideFromRow(row: any) {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? '',
    category: row.category as GuideCategory,
    fileName: row.file_name as string,
    bytes: Number(row.bytes) || 0,
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

export function adminGuideFromRow(row: any) {
  return {
    ...memberGuideFromRow(row),
    sortOrder: Number(row.sort_order) || 0,
    isPublished: Boolean(row.is_published),
    createdAt: new Date(row.created_at).toISOString(),
  }
}
