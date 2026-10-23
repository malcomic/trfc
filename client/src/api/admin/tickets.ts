import api from '../index'

export interface AdminTicket {
  id: string
  event_id: string
  event_title?: string
  event_date?: string
  ticket_type_name?: string | null
  price?: number | null
  phone?: string
  payment_status: string
  purchase_batch_id?: string
  checkout_request_id?: string | null
  mpesa_receipt?: string | null
  checked_in_at?: string | null
  checked_in_by?: string | null
  cancelled_at?: string | null
  payment_provider?: string | null
  email?: string | null
  attendee_name?: string | null
  zone_id?: string | null
  zone_name?: string | null
  created_at: string
}

export const getTicketsForAdmin = async (): Promise<AdminTicket[]> => {
  const response = await api.get('/admin/tickets')
  return response.data
}

export const resendAdminTicket = async (
  id: string,
  email?: string
): Promise<{ success: boolean; email: string }> => {
  const response = await api.post(`/admin/tickets/${id}/resend`, email ? { email } : {})
  return response.data
}
