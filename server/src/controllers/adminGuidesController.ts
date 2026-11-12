import { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { getClient, query } from '../config/db.js'
import { deletePrivateRaw, uploadPrivatePdf } from '../utils/cloudinary.js'
import {
  GUIDE_FOLDER,
  GUIDE_SIZE_ERROR,
  GUIDE_TYPE_ERROR,
  MAX_GUIDE_BYTES,
  adminGuideFromRow,
  cleanGuideFileName,
  isPdf,
  parseGuideInput,
  parseGuideUpdate,
} from '../utils/memberGuides.js'
import { isUuid } from '../utils/zones.js'

const guideUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_GUIDE_BYTES, files: 1 },
}).single('file')

/** Reads an optional PDF from the `file` field; its contents are checked by the handler. */
export function receiveGuideFile(req: Request, res: Response, next: NextFunction) {
  guideUpload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: GUIDE_SIZE_ERROR })
    }
    if (error) return res.status(400).json({ error: 'We could not read that file. Please try again.' })
    next()
  })
}

async function listAll() {
  const result = await query('SELECT * FROM member_guides ORDER BY category, sort_order, created_at')
  return result.rows.map(adminGuideFromRow)
}

export async function listGuides(_req: Request, res: Response) {
  try {
    res.json(await listAll())
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load guides' })
  }
}

export async function createGuide(req: Request, res: Response) {
  const parsed = parseGuideInput(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  if (!req.file) return res.status(400).json({ error: 'Choose a PDF to upload' })
  if (!isPdf(req.file.buffer)) return res.status(400).json({ error: GUIDE_TYPE_ERROR })
  const { title, description, category } = parsed.value
  let publicId: string | null = null
  try {
    const uploaded = await uploadPrivatePdf(req.file.buffer, GUIDE_FOLDER)
    publicId = uploaded.publicId
    const result = await query(
      `INSERT INTO member_guides (title, description, category, public_id, file_name, bytes, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6,
         (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM member_guides WHERE category = $3), $7)
       RETURNING *`,
      [title, description, category, uploaded.publicId, cleanGuideFileName(req.file.originalname, title), uploaded.bytes, req.user?.id ?? null]
    )
    res.status(201).json(adminGuideFromRow(result.rows[0]))
  } catch (error) {
    if (publicId) await deletePrivateRaw(publicId).catch(() => undefined)
    console.error('Failed to upload guide:', error)
    res.status(500).json({ error: 'Failed to upload the guide. Please try again.' })
  }
}

const GUIDE_COLUMNS: Record<string, string> = {
  title: 'title',
  description: 'description',
  category: 'category',
  isPublished: 'is_published',
}

export async function updateGuide(req: Request, res: Response) {
  const id = String(req.params.id)
  if (!isUuid(id)) return res.status(404).json({ error: 'Guide not found' })
  const parsed = parseGuideUpdate(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  if (req.file && !isPdf(req.file.buffer)) return res.status(400).json({ error: GUIDE_TYPE_ERROR })

  let newPublicId: string | null = null
  try {
    const existing = await query('SELECT * FROM member_guides WHERE id = $1', [id])
    const current = existing.rows[0]
    if (!current) return res.status(404).json({ error: 'Guide not found' })

    const sets: string[] = []
    const params: unknown[] = []
    for (const [field, value] of Object.entries(parsed.value)) {
      params.push(value)
      sets.push(`${GUIDE_COLUMNS[field]} = $${params.length}`)
    }
    if (req.file) {
      const uploaded = await uploadPrivatePdf(req.file.buffer, GUIDE_FOLDER)
      newPublicId = uploaded.publicId
      params.push(uploaded.publicId, cleanGuideFileName(req.file.originalname, parsed.value.title ?? current.title), uploaded.bytes)
      sets.push(`public_id = $${params.length - 2}`, `file_name = $${params.length - 1}`, `bytes = $${params.length}`)
    }
    sets.push('updated_at = NOW()')
    params.push(id)
    const result = await query(
      `UPDATE member_guides SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    )
    if (newPublicId) await deletePrivateRaw(current.public_id).catch((error) => console.error('Failed to delete old guide file:', error))
    res.json(adminGuideFromRow(result.rows[0]))
  } catch (error) {
    if (newPublicId) await deletePrivateRaw(newPublicId).catch(() => undefined)
    console.error('Failed to save guide:', error)
    res.status(500).json({ error: 'Failed to save the guide' })
  }
}

export async function deleteGuide(req: Request, res: Response) {
  const id = String(req.params.id)
  if (!isUuid(id)) return res.status(404).json({ error: 'Guide not found' })
  try {
    const result = await query('DELETE FROM member_guides WHERE id = $1 RETURNING public_id', [id])
    if (!result.rows[0]) return res.status(404).json({ error: 'Guide not found' })
    await deletePrivateRaw(result.rows[0].public_id).catch((error) => console.error('Failed to delete guide file:', error))
    res.json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete the guide' })
  }
}

export async function reorderGuides(req: Request, res: Response) {
  const ids = req.body?.ids
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500 || !ids.every((id) => typeof id === 'string' && isUuid(id))) {
    return res.status(400).json({ error: 'Send the guides in their new order' })
  }
  if (new Set(ids).size !== ids.length) return res.status(400).json({ error: 'Each guide can appear once' })
  const client = await getClient()
  try {
    await client.query('BEGIN')
    for (let i = 0; i < ids.length; i++) {
      await client.query('UPDATE member_guides SET sort_order = $1 WHERE id = $2', [(i + 1) * 10, ids[i]])
    }
    await client.query('COMMIT')
    res.json(await listAll())
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    console.error(error)
    res.status(500).json({ error: 'Failed to reorder guides' })
  } finally {
    client.release()
  }
}
