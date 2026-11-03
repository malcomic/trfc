import api from './index'

export interface Zone {
  id: string
  name: string
  code: string
  slug: string
  /** The stretch of road the zone covers, e.g. "Thika town and surrounds, up to Njomoko". */
  stretch?: string | null
}

export async function getZones(): Promise<Zone[]> {
  const response = await api.get<Zone[]>('/zones')
  return response.data
}
