import api from '../index'

export interface AdminTicket {
  id: string
  event_id: string
  event_title?: string
  event_date?: string
  phone?: string
  payment_status: string
  purchase_batch_id?: string
  created_at: string
}

export const getTicketsForAdmin = async (): Promise<AdminTicket[]> => {
  const response = await api.get('/admin/tickets')
  return response.data
}
