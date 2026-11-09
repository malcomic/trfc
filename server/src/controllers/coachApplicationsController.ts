import { createHash } from 'crypto'
import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { deleteVideo, getVideoBytes, signVideoUpload } from '../utils/cloudinary.js'
import { sendCoachApplicationEmails } from '../utils/coachApplicationEmail.js'
import { COACH_VIDEO_FOLDER, MAX_VIDEO_BYTES, cleanApplication, isLikelySpam, type CoachApplicationInput } from '../utils/coachApplications.js'

const hashIp = (ip: string | undefined) => (ip ? createHash('sha256').update(ip).digest('hex') : null)

export function getCoachVideoSignature(_req: Request, res: Response) {
  try {
    res.json({ ...signVideoUpload(COACH_VIDEO_FOLDER), maxBytes: MAX_VIDEO_BYTES })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Video uploads are not available right now. Please paste a link instead.' })
  }
}

/** Null when the upload is fine. A Cloudinary outage should not block an applicant, so only clear failures are rejected. */
async function checkUploadedVideo(value: CoachApplicationInput): Promise<string | null> {
  if (value.videoSource !== 'upload' || !value.videoPublicId) return null
  try {
    const bytes = await getVideoBytes(value.videoPublicId)
    if (bytes === null) return 'The video upload did not finish. Please upload it again.'
    if (bytes > MAX_VIDEO_BYTES) {
      await deleteVideo(value.videoPublicId).catch(() => undefined)
      return 'That video is too big. Please keep it to about 1 minute, or paste a link instead.'
    }
  } catch (error) {
    console.error('Could not check coach video upload:', error)
  }
  return null
}

async function findBySubmissionKey(key: string): Promise<string | null> {
  const existing = await query('SELECT id FROM coach_applications WHERE submission_key = $1', [key])
  return existing.rows[0]?.id ?? null
}

export async function createCoachApplication(req: Request, res: Response) {
  try {
    if (isLikelySpam(req.body)) return res.status(201).json({ ok: true })

    const cleaned = cleanApplication(req.body)
    if (!cleaned.ok) {
      return res.status(400).json({ error: 'Please check the highlighted answers', errors: cleaned.errors })
    }
    const value = cleaned.value

    if (await findBySubmissionKey(value.submissionKey)) return res.status(200).json({ ok: true })

    const videoProblem = await checkUploadedVideo(value)
    if (videoProblem) {
      return res.status(400).json({ error: 'Please check the highlighted answers', errors: { video: videoProblem } })
    }

    const inserted = await query(
      `INSERT INTO coach_applications (
         full_name, phone, email, location, social_url, experience, can_give_3_hours, hours, worked_harder,
         video_url, video_source, video_public_id, agreed_standards_at, agreed_storage_at, submission_key, ip_hash
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), $13, $14)
       ON CONFLICT (submission_key) DO NOTHING
       RETURNING id`,
      [
        value.fullName,
        value.phone,
        value.email,
        value.location,
        value.socialUrl,
        value.experience,
        value.canGive3Hours,
        value.hours,
        value.workedHarder,
        value.videoUrl,
        value.videoSource,
        value.videoPublicId,
        value.submissionKey,
        hashIp(req.ip),
      ]
    )

    const id: string | undefined = inserted.rows[0]?.id
    if (!id) return res.status(200).json({ ok: true })

    void sendCoachApplicationEmails(id)
    res.status(201).json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'We could not send your application. Please try again.' })
  }
}
