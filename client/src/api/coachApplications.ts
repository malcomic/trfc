import api from './index'
import type { CoachApplicationPayload } from '../content/coachHiring'

export interface VideoSignature {
  signature: string
  timestamp: number
  folder: string
  allowedFormats: string
  apiKey: string
  cloudName: string
  uploadUrl: string
  maxBytes: number
}

export const getVideoSignature = async (): Promise<VideoSignature> =>
  (await api.post('/coach-applications/video-signature')).data

/** Uploads straight to Cloudinary so large phone videos never pass through our server. */
export function uploadCoachVideo(
  file: File,
  sig: VideoSignature,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const body = new FormData()
    body.append('file', file)
    body.append('api_key', sig.apiKey)
    body.append('timestamp', String(sig.timestamp))
    body.append('signature', sig.signature)
    body.append('folder', sig.folder)
    body.append('allowed_formats', sig.allowedFormats)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', sig.uploadUrl)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () => {
      let data: any = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* handled below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url && data?.public_id) {
        resolve({ url: data.secure_url, publicId: data.public_id })
      } else {
        reject(new Error(data?.error?.message || 'The upload failed. Please try again.'))
      }
    }
    xhr.onerror = () => reject(new Error('The upload failed. Check your connection and try again.'))
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(body)
  })
}

export const submitCoachApplication = async (payload: CoachApplicationPayload): Promise<{ ok: true }> =>
  (await api.post('/coach-applications', payload)).data
