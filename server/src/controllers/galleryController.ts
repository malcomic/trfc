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

export const uploadMedia = async (req: Request, res: Response) => {
  try {
    const { media_url, media_type, caption } = req.body;
    const result = await query(
      'INSERT INTO gallery (media_url, media_type, caption) VALUES ($1, $2, $3) RETURNING *',
      [media_url, media_type || 'image', caption]
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

    const url = await uploadToCloudinary(req.file.buffer, 'trfc_gallery');
    res.json({ url, media_type: req.body.media_type || 'image' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

export const updateMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { caption, media_type } = req.body;
    const result = await query(
      'UPDATE gallery SET caption = $1, media_type = $2 WHERE id = $3 RETURNING *',
      [caption, media_type, id]
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
