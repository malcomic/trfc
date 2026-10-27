import api from './index'

export type PageVideoSlot = 'find_hero' | 'find_results'

export interface PageVideo {
  slot: PageVideoSlot
  source: 'upload' | 'link'
  provider: 'file' | 'youtube' | 'vimeo'
  video_url: string
  poster_url: string | null
  updated_at: string
}

export type PageVideos = Partial<Record<PageVideoSlot, PageVideo>>

export const getPageVideos = async (page: string): Promise<PageVideos> =>
  (await api.get('/page-videos', { params: { page } })).data

export const savePageVideo = async (
  slot: PageVideoSlot,
  data: { source: 'upload' | 'link'; video_url: string; poster_url?: string | null }
): Promise<PageVideo> => (await api.put(`/admin/page-videos/${slot}`, data)).data

/** Uploads a video or cover image to Cloudinary through the admin gallery upload endpoint. */
export const uploadPageMedia = async (
  file: File,
  mediaType: 'video' | 'image',
  onProgress?: (percent: number) => void
): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('media_type', mediaType)
  const response = await api.post('/gallery/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100))
    },
  })
  return response.data.url
}

export const deletePageVideo = async (slot: PageVideoSlot): Promise<void> => {
  await api.delete(`/admin/page-videos/${slot}`)
}
