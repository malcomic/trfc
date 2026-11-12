import { randomUUID } from 'crypto'
import { v2 as cloudinary } from 'cloudinary'
import { config } from '../config/env.js'

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
})

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  mediaType?: string
): Promise<string> {
  const resourceType = mediaType === 'video' ? 'video' : 'auto'
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) reject(error)
        else resolve(result?.secure_url || '')
      }
    )
    uploadStream.end(fileBuffer)
  })
}

/** Stores a document as-is (raw) so PDFs and Word files download unchanged. `fileName` should include the extension. */
export async function uploadRawToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  fileName: string
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, public_id: fileName, resource_type: 'raw' },
      (error, result) => {
        if (error || !result?.secure_url) reject(error ?? new Error('Upload returned no URL'))
        else resolve({ url: result.secure_url, publicId: result.public_id })
      }
    )
    uploadStream.end(fileBuffer)
  })
}

/**
 * Stores a PDF as an authenticated raw file: it has no public URL, so it can only be
 * fetched through a signed link from `signedPdfUrl`.
 */
export async function uploadPrivatePdf(fileBuffer: Buffer, folder: string): Promise<{ publicId: string; bytes: number }> {
  const fileName = `${randomUUID()}.pdf`
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, public_id: fileName, resource_type: 'raw', type: 'authenticated' },
      (error, result) => {
        if (error || !result?.public_id) reject(error ?? new Error('Upload returned no file'))
        else resolve({ publicId: result.public_id, bytes: typeof result.bytes === 'number' ? result.bytes : fileBuffer.length })
      }
    )
    uploadStream.end(fileBuffer)
  })
}

export const SIGNED_PDF_TTL_SECONDS = 300

/** Short-lived download link for a file stored by `uploadPrivatePdf`. */
export function signedPdfUrl(publicId: string, now = Date.now()): string {
  // Raw public ids already carry the extension, so the format argument stays empty.
  return cloudinary.utils.private_download_url(publicId, '', {
    resource_type: 'raw',
    type: 'authenticated',
    expires_at: Math.floor(now / 1000) + SIGNED_PDF_TTL_SECONDS,
    attachment: true,
  })
}

export async function deletePrivateRaw(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', type: 'authenticated', invalidate: true })
}

export const COACH_VIDEO_FORMATS = 'mp4,mov,webm,3gp,m4v'

export interface SignedVideoUpload {
  signature: string
  timestamp: number
  folder: string
  allowedFormats: string
  apiKey: string
  cloudName: string
  uploadUrl: string
}

/** Lets a browser upload one video straight to Cloudinary, into the given folder only. */
export function signVideoUpload(folder: string): SignedVideoUpload {
  const timestamp = Math.round(Date.now() / 1000)
  const paramsToSign = { timestamp, folder, allowed_formats: COACH_VIDEO_FORMATS }
  const signature = cloudinary.utils.api_sign_request(paramsToSign, config.cloudinary.apiSecret)
  return {
    signature,
    timestamp,
    folder,
    allowedFormats: COACH_VIDEO_FORMATS,
    apiKey: config.cloudinary.apiKey,
    cloudName: config.cloudinary.cloudName,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/video/upload`,
  }
}

/** Size in bytes of an uploaded video, or null when Cloudinary has no such video. */
export async function getVideoBytes(publicId: string): Promise<number | null> {
  try {
    const resource = await cloudinary.api.resource(publicId, { resource_type: 'video' })
    return typeof resource?.bytes === 'number' ? resource.bytes : 0
  } catch (error: any) {
    if (error?.error?.http_code === 404 || error?.http_code === 404) return null
    throw error
  }
}

export async function deletePublicRaw(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', invalidate: true })
}

export async function deleteVideo(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'video' })
}

export default cloudinary
