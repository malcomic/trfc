import { Request, Response } from 'express';
import {
  findProgram,
  getDraftOrPublished,
  getPublishedContent,
  listPublishedCatalog,
  toCatalogEntry,
} from '../utils/programCatalog.js';

export const getProgramCatalog = async (_req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    res.json(await listPublishedCatalog());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load programs' });
  }
};

/** Public program page. Admins can add ?preview=draft to see unpublished changes. */
export const getProgramBySlug = async (req: Request, res: Response) => {
  try {
    const row = await findProgram(req.params.slug);
    const preview = req.query.preview === 'draft' && req.user?.role === 'admin';
    if (!row || (!preview && row.status !== 'published')) {
      return res.status(404).json({ error: 'Program not found' });
    }
    const content = preview ? await getDraftOrPublished(row.id) : await getPublishedContent(row.id);
    if (!content) return res.status(404).json({ error: 'Program not found' });
    if (preview) res.set('Cache-Control', 'no-store');
    res.json({ ...toCatalogEntry(row, content), preview });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load this program' });
  }
};
