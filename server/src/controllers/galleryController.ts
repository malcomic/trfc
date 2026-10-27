import { Request, Response } from 'express';
import { query } from '../config/db.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

export const PROGRAM_PHOTO_IDS = ['foundations', 'fat_loss', 'endurance', 'hiking'] as const;
export type ProgramPhotoId = (typeof PROGRAM_PHOTO_IDS)[number];

export function normalizeProgramPhoto(value: unknown, mediaType?: string): ProgramPhotoId | null {
  if (mediaType === 'video') return null;
  if (typeof value !== 'string') return null;
  return (PROGRAM_PHOTO_IDS as readonly string[]).includes(value) ? (value as ProgramPhotoId) : null;
}

export const getProgramPhotos = async (req: Request, res: Response) => {
  try {
    const result = await query(
      "SELECT program_photo, media_url FROM gallery WHERE program_photo IS NOT NULL AND media_type = 'image'"
    );
    const photos: Partial<Record<ProgramPhotoId, string>> = {};
    for (const row of result.rows) {
      const id = normalizeProgramPhoto(row.program_photo);
      if (id) photos[id] = row.media_url;
    }
    res.json(photos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch program photos' });
  }
};

export const getGallery = async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM gallery ORDER BY uploaded_at DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
};

export const getHeroSlides = async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM gallery WHERE show_on_hero = true ORDER BY hero_sort_order ASC, uploaded_at ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch hero slides' });
  }
};

export const uploadMedia = async (req: Request, res: Response) => {
  try {
    const { media_url, media_type, caption, show_on_hero, hero_sort_order, program_photo } = req.body;
    const type = media_type || 'image';
    const programPhoto = normalizeProgramPhoto(program_photo, type);
    if (programPhoto) {
      await query('UPDATE gallery SET program_photo = NULL WHERE program_photo = $1', [programPhoto]);
    }
    const result = await query(
      'INSERT INTO gallery (media_url, media_type, caption, show_on_hero, hero_sort_order, program_photo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        media_url,
        type,
        caption,
        show_on_hero === true || show_on_hero === 'true',
        hero_sort_order ?? 0,
        programPhoto,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload media' });
  }
};

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const mediaType = req.body.media_type || 'image';
    const url = await uploadToCloudinary(req.file.buffer, 'trfc_gallery', mediaType);
    res.json({ url, media_type: mediaType });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

export const updateMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { caption, media_type, show_on_hero, hero_sort_order, program_photo } = req.body;
    const programPhoto = normalizeProgramPhoto(program_photo, media_type);
    if (programPhoto) {
      await query('UPDATE gallery SET program_photo = NULL WHERE program_photo = $1 AND id <> $2', [programPhoto, id]);
    }
    const result = await query(
      'UPDATE gallery SET caption = $1, media_type = $2, show_on_hero = $3, hero_sort_order = $4, program_photo = $5 WHERE id = $6 RETURNING *',
      [
        caption,
        media_type,
        show_on_hero === true || show_on_hero === 'true',
        hero_sort_order ?? 0,
        programPhoto,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update media' });
  }
};

export const reorderHeroSlides = async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: { id: string; hero_sort_order: number }[] };
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    for (const item of items) {
      await query(
        'UPDATE gallery SET hero_sort_order = $1 WHERE id = $2 AND show_on_hero = true',
        [item.hero_sort_order, item.id]
      );
    }

    const result = await query(
      'SELECT * FROM gallery WHERE show_on_hero = true ORDER BY hero_sort_order ASC, uploaded_at ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reorder hero slides' });
  }
};

export const deleteMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM gallery WHERE id = $1', [id]);
    res.json({ message: 'Media deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
};
