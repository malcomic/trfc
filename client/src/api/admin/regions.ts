import api from '../index'

export interface Region {
  id: string
  name: string
  slug: string
  code: string
  is_active: boolean
  created_at: string
  captain_count: number
}

export interface RegionPayload {
  name: string
  code: string
  is_active?: boolean
}

export const getRegions = async (): Promise<Region[]> => {
  const response = await api.get('/admin/regions')
  return response.data
}

export const createRegion = async (data: RegionPayload): Promise<Region> => {
  const response = await api.post('/admin/regions', data)
  return response.data
}

export const updateRegion = async (id: string, data: RegionPayload): Promise<Region> => {
  const response = await api.put(`/admin/regions/${id}`, data)
  return response.data
}

export const deactivateRegion = async (id: string) => {
  const response = await api.delete(`/admin/regions/${id}`)
  return response.data
}
