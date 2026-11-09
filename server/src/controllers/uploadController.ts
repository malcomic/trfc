import { Request, Response } from 'express';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const ALLOWED_FOLDERS = [
  'trfc_events',
  'trfc_products',
  'trfc_medals',
  'trfc_product_categories',
  'trfc_programs',
  'trfc_program_audio',
] as const;
type UploadFolder = (typeof ALLOWED_FOLDERS)[number];

const TEN_MB = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/webm'];

/** Folders not listed here keep the older behaviour (any file the shared upload limit allows). */
const FOLDER_RULES: Partial<Record<UploadFolder, { types: string[]; maxBytes: number; label: string }>> = {
  trfc_programs: { types: IMAGE_TYPES, maxBytes: TEN_MB, label: 'a JPG, PNG, WebP or GIF image' },
  trfc_program_audio: { types: AUDIO_TYPES, maxBytes: TEN_MB, label: 'an MP3, M4A, OGG or WebM audio file' },
};

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const folder = req.body.folder as string;
    if (!ALLOWED_FOLDERS.includes(folder as UploadFolder)) {
      return res.status(400).json({ error: 'Invalid upload folder' });
    }

    const rules = FOLDER_RULES[folder as UploadFolder];
    if (rules) {
      if (!rules.types.includes(req.file.mimetype)) {
        return res.status(400).json({ error: `Please upload ${rules.label}` });
      }
      if (req.file.size > rules.maxBytes) {
        return res.status(400).json({ error: 'The file must be 10 MB or smaller' });
      }
    }

    const url = await uploadToCloudinary(req.file.buffer, folder);
    res.json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};
