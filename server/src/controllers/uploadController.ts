import { Request, Response } from 'express';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const ALLOWED_FOLDERS = ['trfc_events', 'trfc_products'] as const;

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const folder = req.body.folder as string;
    if (!ALLOWED_FOLDERS.includes(folder as (typeof ALLOWED_FOLDERS)[number])) {
      return res.status(400).json({ error: 'Invalid upload folder' });
    }

    const url = await uploadToCloudinary(req.file.buffer, folder);
    res.json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};
