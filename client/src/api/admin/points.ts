import api from '../index'

export const getPointsSettings = async () => {
  const { data } = await api.get('/admin/points/settings')
  return data
}

export const updatePointsSettings = async (body: Record<string, unknown>) => {
  const { data } = await api.put('/admin/points/settings', body)
  return data
}

export const postSeasonAdjustment = async (body: { userId: string; points: number; reason: string }) => {
  const { data } = await api.post('/admin/points/adjustments', body)
  return data
}

export const listPointsFlags = async () => {
  const { data } = await api.get('/admin/points/flags')
  return data
}

export const resolvePointsFlag = async (id: string) => {
  const { data } = await api.post(`/admin/points/flags/${id}/resolve`)
  return data
}

export const listMissingScans = async (status = 'pending') => {
  const { data } = await api.get('/admin/points/missing-scans', { params: { status } })
  return data
}

export const decideMissingScan = async (id: string, decision: 'approved' | 'rejected', note?: string) => {
  const { data } = await api.post(`/admin/points/missing-scans/${id}/decide`, { decision, note })
  return data
}

export const getInTheRace = async () => {
  const { data } = await api.get('/admin/points/in-the-race')
  return data
}

export const getAwardsPreview = async () => {
  const { data } = await api.get('/admin/points/awards-preview')
  return data
}

export const postZoneChange = async (body: { userId: string; newCaptainId: string; reason: string }) => {
  const { data } = await api.post('/admin/points/zone-change', body)
  return data
}

export const postDisqualify = async (body: { userId: string; reason: string }) => {
  const { data } = await api.post('/admin/points/disqualify', body)
  return data
}

export const listDisputes = async (status = 'pending') => {
  const { data } = await api.get('/admin/points/disputes', { params: { status } })
  return data
}

export const decideDispute = async (
  id: string,
  body: { decision: 'approved' | 'rejected'; coachId?: string; otherCaptainId?: string; note?: string }
) => {
  const { data } = await api.post(`/admin/points/disputes/${id}/decide`, body)
  return data
}

export const listAwardEntries = async (award?: string) => {
  const { data } = await api.get('/admin/points/award-entries', { params: { award } })
  return data
}

export const postAwardWinner = async (body: { award: string; userId: string }) => {
  const { data } = await api.post('/admin/points/awards/winner', body)
  return data
}

export const listCaptainScores = async (month?: string) => {
  const { data } = await api.get('/admin/points/captain-scores', { params: { month } })
  return data
}
