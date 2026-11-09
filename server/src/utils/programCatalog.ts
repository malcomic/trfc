import { query } from '../config/db.js';
import type { ProgramContent } from '../types/programContent.js';

export type ProgramStatus = 'draft' | 'published' | 'archived';

export interface ProgramRow {
  id: string;
  slug: string;
  name: string;
  status: ProgramStatus;
  is_core: boolean;
  sort_order: number;
}

export interface CatalogEntry {
  id: string;
  slug: string;
  name: string;
  is_core: boolean;
  sort_order: number;
  weekCount: number;
  page: ProgramContent['page'];
  card: ProgramContent['card'];
}

const CACHE_MS = process.env.NODE_ENV === 'test' ? 0 : 60_000;
const contentCache = new Map<string, { content: ProgramContent | null; at: number }>();
let catalogCache: { entries: CatalogEntry[]; at: number } | null = null;

/** Called after every publish, archive or settings change so members see it straight away. */
export function clearProgramCache(programId?: string) {
  if (programId) contentCache.delete(programId);
  else contentCache.clear();
  catalogCache = null;
}

const PROGRAM_COLUMNS = 'id, slug, name, status, is_core, sort_order';

/** Finds a program by id or slug, whatever its status. */
export async function findProgram(key: unknown): Promise<ProgramRow | null> {
  if (typeof key !== 'string' || !key || key.length > 60) return null;
  const result = await query(`SELECT ${PROGRAM_COLUMNS} FROM programs WHERE id = $1 OR slug = $1 LIMIT 1`, [key]);
  return result.rows[0] ?? null;
}

export async function findProgramById(id: unknown): Promise<ProgramRow | null> {
  if (typeof id !== 'string' || !id || id.length > 40) return null;
  const result = await query(`SELECT ${PROGRAM_COLUMNS} FROM programs WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function getPublishedContent(programId: string): Promise<ProgramContent | null> {
  const cached = contentCache.get(programId);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.content;
  const result = await query(
    `SELECT content FROM program_versions WHERE program_id = $1 AND state = 'published'`,
    [programId]
  );
  const content = (result.rows[0]?.content as ProgramContent | undefined) ?? null;
  contentCache.set(programId, { content, at: Date.now() });
  return content;
}

export async function getDraftContent(programId: string): Promise<ProgramContent | null> {
  const result = await query(`SELECT content FROM program_versions WHERE program_id = $1 AND state = 'draft'`, [
    programId,
  ]);
  return (result.rows[0]?.content as ProgramContent | undefined) ?? null;
}

export async function getDraftOrPublished(programId: string): Promise<ProgramContent | null> {
  return (await getDraftContent(programId)) ?? (await getPublishedContent(programId));
}

export function toCatalogEntry(row: ProgramRow, content: ProgramContent): CatalogEntry {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    is_core: row.is_core,
    sort_order: row.sort_order,
    weekCount: content.weeks?.length ?? 0,
    page: content.page,
    card: content.card,
  };
}

/** Published, non-archived programs in display order, without their weekly plans. */
export async function listPublishedCatalog(): Promise<CatalogEntry[]> {
  if (catalogCache && Date.now() - catalogCache.at < CACHE_MS) return catalogCache.entries;
  const result = await query(
    `SELECT p.id, p.slug, p.name, p.status, p.is_core, p.sort_order, v.content
     FROM programs p
     JOIN program_versions v ON v.program_id = p.id AND v.state = 'published'
     WHERE p.status = 'published'
     ORDER BY p.sort_order, p.name`
  );
  const entries = result.rows.map((row: ProgramRow & { content: ProgramContent }) => toCatalogEntry(row, row.content));
  catalogCache = { entries, at: Date.now() };
  return entries;
}
