import { Request, Response } from 'express'
import { query } from '../config/db.js'
import {
  clearMaterialCache,
  getLatestPolicy,
  getPolicyVersion,
  getPrivacySettings,
  getPublicPrivacySettings,
  isPolicySlug,
  listPublishedVersions,
  validatePolicyDraft,
  validatePrivacySettings,
} from '../utils/policies.js'

// ---------- Public ----------

export async function getPolicy(req: Request, res: Response) {
  const { slug } = req.params
  if (!isPolicySlug(slug)) return res.status(404).json({ error: 'Page not found' })
  try {
    const doc = await getLatestPolicy(slug)
    if (!doc) return res.status(404).json({ error: 'Page not found' })
    res.json(doc)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load this page' })
  }
}

export async function getPolicyVersions(req: Request, res: Response) {
  const { slug } = req.params
  if (!isPolicySlug(slug)) return res.status(404).json({ error: 'Page not found' })
  try {
    res.json(await listPublishedVersions(slug))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load versions' })
  }
}

export async function getPolicyAtVersion(req: Request, res: Response) {
  const { slug, version } = req.params
  if (!isPolicySlug(slug)) return res.status(404).json({ error: 'Page not found' })
  try {
    const doc = await getPolicyVersion(slug, version)
    if (!doc) return res.status(404).json({ error: 'Version not found' })
    res.json(doc)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load this version' })
  }
}

export async function getPublicSettings(_req: Request, res: Response) {
  try {
    res.json(await getPublicPrivacySettings())
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load privacy settings' })
  }
}

// ---------- Admin ----------

export async function adminListPolicies(_req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT id, slug, version, title, intro, sections, to_char(last_updated, 'YYYY-MM-DD') AS last_updated,
              is_material, status, published_at, created_at, updated_at
       FROM policy_documents
       ORDER BY slug, COALESCE(published_at, created_at) DESC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load policies' })
  }
}

export async function adminCreateDraft(req: Request, res: Response) {
  const slug = req.body?.slug
  if (!isPolicySlug(slug)) return res.status(400).json({ error: 'Choose which page this is for' })
  const validation = validatePolicyDraft(req.body ?? {})
  if ('error' in validation) return res.status(400).json(validation)
  try {
    const result = await query(
      `INSERT INTO policy_documents (slug, version, title, intro, sections, last_updated, status, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::date, 'draft', $7)
       RETURNING id`,
      [slug, validation.version, validation.title, validation.intro, JSON.stringify(validation.sections), validation.lastUpdated, req.user!.id]
    )
    res.status(201).json({ id: result.rows[0].id })
  } catch (error: any) {
    if (error?.code === '23505') return res.status(400).json({ error: 'That version number is already used for this page' })
    console.error(error)
    res.status(500).json({ error: 'Failed to save the draft' })
  }
}

export async function adminUpdateDraft(req: Request, res: Response) {
  const validation = validatePolicyDraft(req.body ?? {})
  if ('error' in validation) return res.status(400).json(validation)
  try {
    const result = await query(
      `UPDATE policy_documents
       SET version = $1, title = $2, intro = $3, sections = $4::jsonb, last_updated = $5::date, updated_at = NOW()
       WHERE id = $6 AND status = 'draft'
       RETURNING id`,
      [validation.version, validation.title, validation.intro, JSON.stringify(validation.sections), validation.lastUpdated, req.params.id]
    )
    if (result.rows.length === 0) return res.status(400).json({ error: 'Only drafts can be edited. Published versions stay on file.' })
    res.json({ id: result.rows[0].id })
  } catch (error: any) {
    if (error?.code === '23505') return res.status(400).json({ error: 'That version number is already used for this page' })
    console.error(error)
    res.status(500).json({ error: 'Failed to save the draft' })
  }
}

export async function adminPublishDraft(req: Request, res: Response) {
  try {
    const result = await query(
      `UPDATE policy_documents
       SET status = 'published', published_at = NOW(), is_material = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'draft'
       RETURNING id, slug, version`,
      [req.body?.isMaterial === true, req.params.id]
    )
    if (result.rows.length === 0) return res.status(400).json({ error: 'Only drafts can be published' })
    clearMaterialCache()
    res.json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to publish' })
  }
}

export async function adminDeleteDraft(req: Request, res: Response) {
  try {
    const result = await query(`DELETE FROM policy_documents WHERE id = $1 AND status = 'draft' RETURNING id`, [req.params.id])
    if (result.rows.length === 0) return res.status(400).json({ error: 'Only drafts can be deleted' })
    res.json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete the draft' })
  }
}

export async function adminGetPrivacySettings(_req: Request, res: Response) {
  try {
    res.json(await getPrivacySettings())
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load privacy settings' })
  }
}

export async function adminUpdatePrivacySettings(req: Request, res: Response) {
  const validation = validatePrivacySettings(req.body ?? {})
  if ('error' in validation) return res.status(400).json(validation)
  try {
    for (const [key, value] of Object.entries(validation)) {
      await query(
        `INSERT INTO privacy_settings (key, value, updated_by, updated_at) VALUES ($1, $2::jsonb, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
        [key, JSON.stringify(value), req.user!.id]
      )
    }
    res.json(await getPrivacySettings())
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save privacy settings' })
  }
}

export async function adminGetUserConsents(req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT cr.id, cr.consent_type, cr.granted, cr.policy_slug, cr.policy_version, cr.source, cr.created_at,
              cu.name AS captain_name
       FROM consent_records cr
       LEFT JOIN users cu ON cu.id = cr.captain_id
       WHERE cr.user_id = $1
       ORDER BY cr.created_at DESC`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load consent history' })
  }
}
