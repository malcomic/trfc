import { Request, Response } from 'express';
import { getClient, query } from '../config/db.js';
import { blankProgramContent, placeholderWeek } from '../config/programSeed.js';
import type { ProgramContent, ProgramWeekContent } from '../types/programContent.js';
import { clearProgramCache, type ProgramRow } from '../utils/programCatalog.js';
import {
  MAX_WEEKS,
  SLUG_PATTERN,
  checkForPublish,
  cleanCard,
  cleanContent,
  cleanPage,
  cleanPlan,
  cleanWeek,
  idFromSlug,
  slugify,
  type PublishCheck,
} from '../utils/programContentValidation.js';
import { parsePositiveInt } from '../utils/programProgress.js';

type DbClient = Awaited<ReturnType<typeof getClient>>;

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

function sendError(res: Response, error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, ...error.extra });
  }
  console.error(error);
  return res.status(500).json({ error: fallback });
}

async function inTransaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

const PROGRAM_COLUMNS = 'id, slug, name, status, is_core, sort_order, created_at, updated_at';
const FREE_PROGRAM_ID = 'foundations';

async function lockProgram(client: DbClient, id: string): Promise<ProgramRow> {
  const result = await client.query(`SELECT ${PROGRAM_COLUMNS} FROM programs WHERE id = $1 FOR UPDATE`, [id]);
  if (!result.rows[0]) throw new HttpError(404, 'Program not found');
  return result.rows[0];
}

interface DraftRow {
  id: string;
  content: ProgramContent;
  updated_at: string;
}

const sameTime = (a: string | Date | null | undefined, b: string | Date | null | undefined) =>
  !!a && !!b && new Date(a).getTime() === new Date(b).getTime();

/**
 * Returns the draft to edit, creating it from the published version when there is none.
 * expectedUpdatedAt guards against two tabs or admins overwriting each other:
 * undefined skips the check, null means "I saw no draft", a timestamp must match the draft.
 */
async function draftForEdit(
  client: DbClient,
  programId: string,
  userId: string,
  expectedUpdatedAt: unknown
): Promise<DraftRow> {
  const existing = await client.query(
    `SELECT id, content, updated_at FROM program_versions
     WHERE program_id = $1 AND state = 'draft' FOR UPDATE`,
    [programId]
  );
  const draft: DraftRow | undefined = existing.rows[0];
  if (draft) {
    if (expectedUpdatedAt !== undefined && !sameTime(draft.updated_at, expectedUpdatedAt as string)) {
      throw new HttpError(409, 'This draft was changed in another tab or by another admin. Reload to see the latest.', {
        conflict: true,
      });
    }
    return draft;
  }
  if (expectedUpdatedAt) {
    throw new HttpError(409, 'This draft was published or discarded somewhere else. Reload to see the latest.', {
      conflict: true,
    });
  }
  const published = await client.query(
    `SELECT content FROM program_versions WHERE program_id = $1 AND state = 'published'`,
    [programId]
  );
  if (!published.rows[0]) throw new HttpError(404, 'This program has no content yet');
  const created = await client.query(
    `INSERT INTO program_versions (program_id, state, content, created_by, updated_by)
     VALUES ($1, 'draft', $2, $3, $3)
     RETURNING id, content, updated_at`,
    [programId, JSON.stringify(published.rows[0].content), userId]
  );
  return created.rows[0];
}

async function saveDraft(client: DbClient, draftId: string, content: ProgramContent, userId: string): Promise<string> {
  const result = await client.query(
    `UPDATE program_versions SET content = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING updated_at`,
    [draftId, JSON.stringify(content), userId]
  );
  return result.rows[0].updated_at;
}

/** Runs one change against the draft and returns the saved content. */
async function editDraft(
  req: Request,
  change: (content: ProgramContent) => ProgramContent
): Promise<{ content: ProgramContent; draftUpdatedAt: string }> {
  return inTransaction(async (client) => {
    const program = await lockProgram(client, req.params.id);
    const draft = await draftForEdit(client, program.id, req.user!.id, req.body?.expectedUpdatedAt);
    const content = change(structuredClone(draft.content));
    const draftUpdatedAt = await saveDraft(client, draft.id, content, req.user!.id);
    await client.query('UPDATE programs SET updated_at = NOW() WHERE id = $1', [program.id]);
    return { content, draftUpdatedAt };
  });
}

function renumber(weeks: ProgramWeekContent[]): ProgramWeekContent[] {
  return weeks.map((w, i) => ({ ...w, week: i + 1 }));
}

async function enrolledCount(programId: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM program_enrollments WHERE program = $1 AND status = 'active'`,
    [programId]
  );
  return Number(result.rows[0]?.count ?? 0);
}

/** How many weeks the furthest member has already checked in. */
async function furthestCheckins(programId: string): Promise<number> {
  const result = await query(
    `SELECT COALESCE(MAX(n), 0)::int AS weeks FROM (
       SELECT COUNT(*) AS n FROM program_checkins WHERE program = $1 GROUP BY user_id
     ) per_member`,
    [programId]
  );
  return Number(result.rows[0]?.weeks ?? 0);
}

async function editorPayload(programId: string) {
  const [program, versions, enrolled] = await Promise.all([
    query(`SELECT ${PROGRAM_COLUMNS} FROM programs WHERE id = $1`, [programId]),
    query(
      `SELECT state, content, updated_at, published_at FROM program_versions
       WHERE program_id = $1 AND state IN ('draft', 'published')`,
      [programId]
    ),
    enrolledCount(programId),
  ]);
  if (!program.rows[0]) throw new HttpError(404, 'Program not found');
  const draft = versions.rows.find((v: { state: string }) => v.state === 'draft');
  const published = versions.rows.find((v: { state: string }) => v.state === 'published');
  return {
    program: program.rows[0],
    content: (draft ?? published)?.content ?? null,
    hasDraft: !!draft,
    hasPublished: !!published,
    draftUpdatedAt: draft?.updated_at ?? null,
    publishedAt: published?.published_at ?? null,
    enrolledCount: enrolled,
  };
}

export const listAdminPrograms = async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT p.id, p.slug, p.name, p.status, p.is_core, p.sort_order, p.updated_at,
              pub.published_at, d.updated_at AS draft_updated_at,
              COALESCE(jsonb_array_length(COALESCE(d.content, pub.content)->'weeks'), 0)::int AS week_count,
              COALESCE((COALESCE(d.content, pub.content)->'page'->>'price')::int, 0) AS price,
              (SELECT COUNT(*)::int FROM program_enrollments e WHERE e.program = p.id AND e.status = 'active') AS enrolled_count
       FROM programs p
       LEFT JOIN program_versions pub ON pub.program_id = p.id AND pub.state = 'published'
       LEFT JOIN program_versions d ON d.program_id = p.id AND d.state = 'draft'
       ORDER BY (p.status = 'archived'), p.sort_order, p.name`
    );
    res.json(result.rows);
  } catch (error) {
    sendError(res, error, 'Failed to load programs');
  }
};

export const getAdminProgram = async (req: Request, res: Response) => {
  try {
    res.json(await editorPayload(req.params.id));
  } catch (error) {
    sendError(res, error, 'Failed to load this program');
  }
};

export const createAdminProgram = async (req: Request, res: Response) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ error: 'Give the program a name of 2 to 80 characters' });
    }
    const slug = slugify(typeof req.body?.slug === 'string' && req.body.slug.trim() ? req.body.slug : name);
    if (slug.length < 2 || !SLUG_PATTERN.test(slug)) {
      return res.status(400).json({ error: 'The web address can only use letters, numbers and dashes' });
    }
    const id = idFromSlug(slug);
    const lengthWeeks = req.body?.lengthWeeks === undefined ? 4 : parsePositiveInt(req.body.lengthWeeks);
    if (!lengthWeeks || lengthWeeks > MAX_WEEKS) {
      return res.status(400).json({ error: `A program can be 1 to ${MAX_WEEKS} weeks long` });
    }

    let content = blankProgramContent(name, lengthWeeks);
    if (req.body?.copyFrom) {
      const source = await query(
        `SELECT content FROM program_versions WHERE program_id = $1 AND state IN ('draft', 'published')
         ORDER BY (state = 'draft') DESC LIMIT 1`,
        [String(req.body.copyFrom)]
      );
      if (!source.rows[0]) return res.status(400).json({ error: 'The program to copy was not found' });
      content = structuredClone(source.rows[0].content);
      content.page.title = name;
    }

    await inTransaction(async (client) => {
      const taken = await client.query('SELECT 1 FROM programs WHERE id = $1 OR slug = $2', [id, slug]);
      if (taken.rows[0]) throw new HttpError(409, 'Another program already uses this web address');
      await client.query(
        `INSERT INTO programs (id, slug, name, status, is_core, sort_order, created_by)
         VALUES ($1, $2, $3, 'draft', false, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM programs), $4)`,
        [id, slug, name, req.user!.id]
      );
      await client.query(
        `INSERT INTO program_versions (program_id, state, content, created_by, updated_by)
         VALUES ($1, 'draft', $2, $3, $3)`,
        [id, JSON.stringify(content), req.user!.id]
      );
    });
    res.status(201).json(await editorPayload(id));
  } catch (error) {
    sendError(res, error, 'Failed to create the program');
  }
};

const SECTION_CLEANERS = { page: cleanPage, card: cleanCard, plan: cleanPlan } as const;
type Section = keyof typeof SECTION_CLEANERS;

export const saveDraftSection = async (req: Request, res: Response) => {
  try {
    const section = req.params.section as Section;
    if (!(section in SECTION_CLEANERS)) return res.status(404).json({ error: 'Unknown section' });
    const cleaned = SECTION_CLEANERS[section](req.body?.value);
    if (!cleaned.ok) return res.status(400).json({ error: cleaned.error });
    res.json(
      await editDraft(req, (content) => ({ ...content, [section]: cleaned.value }) as ProgramContent)
    );
  } catch (error) {
    sendError(res, error, 'Failed to save your changes');
  }
};

export const saveDraftWeek = async (req: Request, res: Response) => {
  try {
    const weekNumber = parsePositiveInt(req.params.week);
    if (!weekNumber) return res.status(400).json({ error: 'Unknown week' });
    const cleaned = cleanWeek(req.body?.value, weekNumber);
    if (!cleaned.ok) return res.status(400).json({ error: cleaned.error });
    res.json(
      await editDraft(req, (content) => {
        if (weekNumber > content.weeks.length) throw new HttpError(404, 'Unknown week');
        content.weeks[weekNumber - 1] = cleaned.value;
        return content;
      })
    );
  } catch (error) {
    sendError(res, error, 'Failed to save this week');
  }
};

export const addDraftWeek = async (req: Request, res: Response) => {
  try {
    const copyFrom = req.body?.copyFrom === undefined || req.body.copyFrom === null ? null : parsePositiveInt(req.body.copyFrom);
    res.status(201).json(
      await editDraft(req, (content) => {
        if (content.weeks.length >= MAX_WEEKS) throw new HttpError(400, `A program can have at most ${MAX_WEEKS} weeks`);
        const next = content.weeks.length + 1;
        let week = placeholderWeek(next);
        if (copyFrom) {
          const source = content.weeks[copyFrom - 1];
          if (!source) throw new HttpError(404, 'The week to copy was not found');
          week = { ...structuredClone(source), week: next, title: `${source.title} (copy)`.slice(0, 120) };
        }
        content.weeks.push(week);
        return content;
      })
    );
  } catch (error) {
    sendError(res, error, 'Failed to add a week');
  }
};

export const removeDraftWeek = async (req: Request, res: Response) => {
  try {
    const weekNumber = parsePositiveInt(req.params.week);
    if (!weekNumber) return res.status(400).json({ error: 'Unknown week' });
    res.json(
      await editDraft(req, (content) => {
        if (weekNumber > content.weeks.length) throw new HttpError(404, 'Unknown week');
        if (content.weeks.length === 1) throw new HttpError(400, 'A program needs at least one week');
        content.weeks = renumber(content.weeks.filter((w, i) => i !== weekNumber - 1));
        return content;
      })
    );
  } catch (error) {
    sendError(res, error, 'Failed to remove the week');
  }
};

export const moveDraftWeek = async (req: Request, res: Response) => {
  try {
    const weekNumber = parsePositiveInt(req.params.week);
    const direction = req.body?.direction;
    if (!weekNumber || (direction !== 'up' && direction !== 'down')) {
      return res.status(400).json({ error: 'Say which week to move, and whether up or down' });
    }
    res.json(
      await editDraft(req, (content) => {
        const from = weekNumber - 1;
        const to = direction === 'up' ? from - 1 : from + 1;
        if (from >= content.weeks.length || to < 0 || to >= content.weeks.length) {
          throw new HttpError(400, 'That week cannot move further');
        }
        [content.weeks[from], content.weeks[to]] = [content.weeks[to], content.weeks[from]];
        content.weeks = renumber(content.weeks);
        return content;
      })
    );
  } catch (error) {
    sendError(res, error, 'Failed to move the week');
  }
};

export const updateProgramSettings = async (req: Request, res: Response) => {
  try {
    const { name, slug, sortOrder } = req.body ?? {};
    await inTransaction(async (client) => {
      const program = await lockProgram(client, req.params.id);
      const nextName = name === undefined ? program.name : typeof name === 'string' ? name.trim() : '';
      if (nextName.length < 2 || nextName.length > 80) {
        throw new HttpError(400, 'Give the program a name of 2 to 80 characters');
      }
      let nextSlug = program.slug;
      if (slug !== undefined && slug !== program.slug) {
        if (program.is_core) throw new HttpError(400, 'The web address of a core program cannot change');
        nextSlug = typeof slug === 'string' ? slugify(slug) : '';
        if (nextSlug.length < 2 || !SLUG_PATTERN.test(nextSlug)) {
          throw new HttpError(400, 'The web address can only use letters, numbers and dashes');
        }
        const taken = await client.query('SELECT 1 FROM programs WHERE slug = $1 AND id <> $2', [nextSlug, program.id]);
        if (taken.rows[0]) throw new HttpError(409, 'Another program already uses this web address');
      }
      let nextOrder = program.sort_order;
      if (sortOrder !== undefined) {
        if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 1000) {
          throw new HttpError(400, 'The position must be a whole number from 0 to 1000');
        }
        nextOrder = sortOrder;
      }
      await client.query(
        'UPDATE programs SET name = $2, slug = $3, sort_order = $4, updated_at = NOW() WHERE id = $1',
        [program.id, nextName, nextSlug, nextOrder]
      );
    });
    clearProgramCache(req.params.id);
    res.json(await editorPayload(req.params.id));
  } catch (error) {
    sendError(res, error, 'Failed to save the settings');
  }
};

async function publishCheckFor(programId: string, content: ProgramContent): Promise<PublishCheck> {
  const check = checkForPublish(content);
  const furthest = await furthestCheckins(programId);
  if (furthest > 0 && content.weeks.length < furthest) {
    check.warnings.push({
      where: 'Weekly plan',
      message: `A member has already finished ${furthest} weeks. With ${content.weeks.length} weeks they will show as graduated.`,
    });
  }
  return check;
}

export const getPublishCheck = async (req: Request, res: Response) => {
  try {
    const draft = await query(
      `SELECT content FROM program_versions WHERE program_id = $1 AND state = 'draft'`,
      [req.params.id]
    );
    if (!draft.rows[0]) return res.json({ hasDraft: false, errors: [], warnings: [] });
    const cleaned = cleanContent(draft.rows[0].content);
    if (!cleaned.ok) {
      return res.json({ hasDraft: true, errors: [{ where: 'Content', message: cleaned.error }], warnings: [] });
    }
    res.json({ hasDraft: true, ...(await publishCheckFor(req.params.id, cleaned.value)) });
  } catch (error) {
    sendError(res, error, 'Failed to check the program');
  }
};

export const publishProgram = async (req: Request, res: Response) => {
  try {
    const acceptWarnings = req.body?.acceptWarnings === true;
    await inTransaction(async (client) => {
      const program = await lockProgram(client, req.params.id);
      const draft = await client.query(
        `SELECT id, content FROM program_versions WHERE program_id = $1 AND state = 'draft' FOR UPDATE`,
        [program.id]
      );
      if (!draft.rows[0]) {
        const published = await client.query(
          `SELECT 1 FROM program_versions WHERE program_id = $1 AND state = 'published'`,
          [program.id]
        );
        if (!published.rows[0]) throw new HttpError(400, 'There is nothing to publish yet');
        if (program.status === 'published') throw new HttpError(400, 'There are no changes to publish');
        await client.query(`UPDATE programs SET status = 'published', updated_at = NOW() WHERE id = $1`, [program.id]);
        return;
      }
      const cleaned = cleanContent(draft.rows[0].content);
      if (!cleaned.ok) throw new HttpError(400, cleaned.error);
      const check = await publishCheckFor(program.id, cleaned.value);
      if (check.errors.length) throw new HttpError(400, 'Fix these before publishing', { ...check });
      if (check.warnings.length && !acceptWarnings) {
        throw new HttpError(409, 'Please confirm these warnings', { ...check, needsConfirm: true });
      }
      await client.query(
        `UPDATE program_versions SET state = 'superseded' WHERE program_id = $1 AND state = 'published'`,
        [program.id]
      );
      await client.query(
        `UPDATE program_versions
         SET state = 'published', content = $2, published_by = $3, published_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [draft.rows[0].id, JSON.stringify(cleaned.value), req.user!.id]
      );
      await client.query(`UPDATE programs SET status = 'published', updated_at = NOW() WHERE id = $1`, [program.id]);
    });
    clearProgramCache(req.params.id);
    res.json(await editorPayload(req.params.id));
  } catch (error) {
    sendError(res, error, 'Failed to publish the program');
  }
};

export const discardDraft = async (req: Request, res: Response) => {
  try {
    await inTransaction(async (client) => {
      const program = await lockProgram(client, req.params.id);
      const published = await client.query(
        `SELECT 1 FROM program_versions WHERE program_id = $1 AND state = 'published'`,
        [program.id]
      );
      if (!published.rows[0]) {
        throw new HttpError(409, 'This program has never been published, so there is nothing to go back to. Archive it instead.');
      }
      await client.query(`DELETE FROM program_versions WHERE program_id = $1 AND state = 'draft'`, [program.id]);
    });
    res.json(await editorPayload(req.params.id));
  } catch (error) {
    sendError(res, error, 'Failed to discard the draft');
  }
};

export const archiveProgram = async (req: Request, res: Response) => {
  try {
    await inTransaction(async (client) => {
      const program = await lockProgram(client, req.params.id);
      if (program.id === FREE_PROGRAM_ID) {
        throw new HttpError(400, 'Couch to 5K is the free starting program and cannot be archived');
      }
      await client.query(`UPDATE programs SET status = 'archived', updated_at = NOW() WHERE id = $1`, [program.id]);
    });
    clearProgramCache(req.params.id);
    res.json(await editorPayload(req.params.id));
  } catch (error) {
    sendError(res, error, 'Failed to archive the program');
  }
};

/** Brings an archived program back: live again if it was ever published, otherwise a draft. */
export const unarchiveProgram = async (req: Request, res: Response) => {
  try {
    await inTransaction(async (client) => {
      const program = await lockProgram(client, req.params.id);
      if (program.status !== 'archived') throw new HttpError(400, 'This program is not archived');
      await client.query(
        `UPDATE programs SET updated_at = NOW(), status = CASE WHEN EXISTS (
           SELECT 1 FROM program_versions WHERE program_id = $1 AND state = 'published'
         ) THEN 'published' ELSE 'draft' END
         WHERE id = $1`,
        [program.id]
      );
    });
    clearProgramCache(req.params.id);
    res.json(await editorPayload(req.params.id));
  } catch (error) {
    sendError(res, error, 'Failed to bring the program back');
  }
};

export const listProgramVersions = async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT v.id, v.state, v.created_at, v.updated_at, v.published_at,
              COALESCE(jsonb_array_length(v.content->'weeks'), 0)::int AS week_count,
              pu.name AS published_by_name, uu.name AS updated_by_name
       FROM program_versions v
       LEFT JOIN users pu ON pu.id = v.published_by
       LEFT JOIN users uu ON uu.id = v.updated_by
       WHERE v.program_id = $1
       ORDER BY COALESCE(v.published_at, v.updated_at) DESC
       LIMIT 30`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    sendError(res, error, 'Failed to load the history');
  }
};

/** Copies an older version into the draft. Nothing changes for members until it is published. */
export const restoreProgramVersion = async (req: Request, res: Response) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.versionId)) return res.status(404).json({ error: 'Version not found' });
    await inTransaction(async (client) => {
      const program = await lockProgram(client, req.params.id);
      const source = await client.query(
        `SELECT content, state FROM program_versions WHERE id = $1 AND program_id = $2`,
        [req.params.versionId, program.id]
      );
      if (!source.rows[0]) throw new HttpError(404, 'Version not found');
      if (source.rows[0].state === 'draft') throw new HttpError(400, 'This is already the draft');
      const content = JSON.stringify(source.rows[0].content);
      const updated = await client.query(
        `UPDATE program_versions SET content = $2, updated_by = $3, updated_at = NOW()
         WHERE program_id = $1 AND state = 'draft' RETURNING id`,
        [program.id, content, req.user!.id]
      );
      if (!updated.rows[0]) {
        await client.query(
          `INSERT INTO program_versions (program_id, state, content, created_by, updated_by)
           VALUES ($1, 'draft', $2, $3, $3)`,
          [program.id, content, req.user!.id]
        );
      }
    });
    res.json(await editorPayload(req.params.id));
  } catch (error) {
    sendError(res, error, 'Failed to restore this version');
  }
};
