import api from '../index'
import type { TypographySettings } from '../../config/fontCatalog'

export async function getTypographyForAdmin(): Promise<TypographySettings> {
  const response = await api.get('/admin/settings/typography')
  return response.data
}

export async function updateTypography(settings: TypographySettings): Promise<TypographySettings> {
  const response = await api.put('/admin/settings/typography', settings)
  return response.data
}

export async function resetTypography(): Promise<TypographySettings> {
  const response = await api.post('/admin/settings/typography/reset')
  return response.data
}
