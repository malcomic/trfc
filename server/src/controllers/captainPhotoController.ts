import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { query } from '../config/db.js'
import { uploadToCloudinary } from '../utils/cloudinary.js'

export const CAPTAIN_PHOTO_FOLDER = 'trfc_captains'
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_TYPES.includes(file.mimetype)),
}).single('photo')

/** Reads one photo from the `photo` field; files of other types are dropped so the handler can reject them. */
export function receiveCaptainPhoto(req: Request, res: Response, next: NextFunction) {
  photoUpload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'The photo must be 5 MB or smaller' })
    }
    if (error) return res.status(400).json({ error: 'Could not read the photo' })
    next()
  })
}

/** A 400×400 square centred on the face, in whatever format suits the browser. */
export function squareFaceUrl(url: string): string {
  return url.includes('/image/upload/')
    ? url.replace('/image/upload/', '/image/upload/c_fill,g_face,w_400,h_400,f_auto,q_auto/')
    : url
}

export async function uploadMyCaptainPhoto(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ error: 'Choose a JPG, PNG or WebP photo' })
  try {
    const uploaded = await uploadToCloudinary(req.file.buffer, CAPTAIN_PHOTO_FOLDER)
    if (!uploaded) return res.status(502).json({ error: 'Failed to upload the photo' })
    const photoUrl = squareFaceUrl(uploaded)
    const result = await query('UPDATE captains SET photo_url = $2 WHERE user_id = $1 RETURNING photo_url', [
      req.user!.id,
      photoUrl,
    ])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Captain profile not found' })
    res.json({ photo_url: result.rows[0].photo_url })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to upload the photo' })
  }
}

export async function removeMyCaptainPhoto(req: Request, res: Response) {
  try {
    await query('UPDATE captains SET photo_url = NULL WHERE user_id = $1', [req.user!.id])
    res.json({ photo_url: null })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to remove the photo' })
  }
}

/** Admins take down a photo that isn't suitable; the captain can upload a new one. */
export async function adminRemoveCaptainPhoto(req: Request, res: Response) {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(404).json({ error: 'Captain not found' })
  try {
    const result = await query('UPDATE captains SET photo_url = NULL WHERE user_id = $1 RETURNING user_id', [
      req.params.id,
    ])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Captain not found' })
    res.json({ photo_url: null })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to remove the photo' })
  }
}
