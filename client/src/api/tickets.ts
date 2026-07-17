import api from './index'

export interface Ticket {
  id: string
  user_id: string | null
  event_id: string
  phone?: string | null
  email?: string | null
  attendee_name?: string | null
  payment_status: 'pending' | 'paid' | 'failed'
  mpesa_receipt: string | null
  checkout_request_id: string | null
  created_at: string
  event_title?: string
  event_date?: string
  event_price?: number
  event_location?: string
  price?: number
  location?: string
}

/**
 * Buy tickets for an event
 */
export async function buyTickets(eventId: string, quantity: number, phone: string) {
  const response = await api.post('/events/tickets', {
    eventId,
    quantity,
    phone,
  })
  return response.data
}

/**
 * Get all tickets for the current user
 */
export async function getUserTickets(): Promise<Ticket[]> {
  const response = await api.get('/events/tickets/list/user')
  return response.data
}

/**
 * Get a single ticket by ID
 */
export async function getTicketById(ticketId: string): Promise<Ticket> {
  const response = await api.get(`/events/tickets/${ticketId}`)
  return response.data
}

/**
 * Update ticket payment status
 */
export async function updateTicketPaymentStatus(
  ticketId: string,
  paymentStatus: string,
  mpesaReceipt?: string
) {
  const response = await api.patch(`/events/tickets/${ticketId}`, {
    paymentStatus,
    mpesaReceipt,
  })
  return response.data
}

/**
 * Download ticket as PDF
 * Authenticated owners, or guests verifying with checkout email/phone.
 */
export async function downloadTicket(
  ticketId: string,
  verify?: { email?: string; phone?: string }
): Promise<void> {
  try {
    const response = await api.get(`/events/tickets/${ticketId}/download`, {
      responseType: 'blob',
      params: {
        ...(verify?.email ? { email: verify.email } : {}),
        ...(verify?.phone ? { phone: verify.phone } : {}),
      },
    })

    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ticket-${ticketId.replace(/-/g, '').slice(0, 8).toUpperCase()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    console.error('❌ Error downloading ticket:', error)
    throw error
  }
}

export default {
  buyTickets,
  getUserTickets,
  getTicketById,
  updateTicketPaymentStatus,
  downloadTicket,
}
