import api from './index'

export interface Zone {
  id: string
  name: string
  code: string
}

export async function getZones(): Promise<Zone[]> {
  const response = await api.get<Zone[]>('/zones')
  return response.data
}
