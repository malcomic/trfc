import api from '../index'

export const getGallery = async () => {
  const response = await api.get('/gallery')
  return response.data
}

export const uploadGalleryFile = async (formData: FormData) => {
  const response = await api.post('/gallery/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const uploadMedia = async (data: {
  media_url: string
  media_type?: string
  caption?: string
  show_on_hero?: boolean
  hero_sort_order?: number
}) => {
  const response = await api.post('/gallery', data)
  return response.data
}

export const updateMedia = async (
  id: string,
  data: {
    caption?: string
    media_type?: string
    show_on_hero?: boolean
    hero_sort_order?: number
  }
) => {
  const response = await api.put(`/gallery/${id}`, data)
  return response.data
}

export const reorderHeroSlides = async (
  items: { id: string; hero_sort_order: number }[]
) => {
  const response = await api.patch('/gallery/hero/reorder', { items })
  return response.data
}

export const deleteMedia = async (id: string) => {
  const response = await api.delete(`/gallery/${id}`)
  return response.data
}
