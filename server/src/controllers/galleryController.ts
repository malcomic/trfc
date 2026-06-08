import { Request, Response } from 'express';
import { query } from '../config/db.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

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
    const { media_url, media_type, caption, show_on_hero, hero_sort_order } = req.body;
    const result = await query(
      'INSERT INTO gallery (media_url, media_type, caption, show_on_hero, hero_sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        media_url,
        media_type || 'image',
        caption,
        show_on_hero === true || show_on_hero === 'true',
        hero_sort_order ?? 0,
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
    const { caption, media_type, show_on_hero, hero_sort_order } = req.body;
    const result = await query(
      'UPDATE gallery SET caption = $1, media_type = $2, show_on_hero = $3, hero_sort_order = $4 WHERE id = $5 RETURNING *',
      [
        caption,
        media_type,
        show_on_hero === true || show_on_hero === 'true',
        hero_sort_order ?? 0,
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
