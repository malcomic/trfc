import api from './index'

export interface AttendanceEvent {
  id: string
  title: string
  event_date: string
  location: string | null
  scan_list_confirmed_at: string | null
  cancelled_at: string | null
  paid: number
  scanned: number
  no_shows: number
  cancelled_early: number
}

export type AttendanceStatus = 'attended' | 'no_show' | 'cancelled_early' | 'excused' | null

export interface ScanListTicket {
  id: string
  attendee_name: string | null
  user_name: string | null
  phone: string | null
  email: string | null
  payment_status: string
  checked_in_at: string | null
  attendance_status: AttendanceStatus
  marked_present_at: string | null
  cancel_notice_at: string | null
}

export interface ScanList {
  event: {
    id: string
    title: string
    event_date: string
    location: string | null
    scan_list_confirmed_at: string | null
    cancelled_at: string | null
    starts_at: string
  }
  tickets: ScanListTicket[]
  markPresentUntil: string
}

/** Events the signed-in admin or zone captain can take attendance for (recent and upcoming). */
export const getAttendanceEvents = async (): Promise<AttendanceEvent[]> => (await api.get('/attendance/events')).data

export const getScanList = async (eventId: string): Promise<ScanList> =>
  (await api.get(`/attendance/events/${eventId}/scan-list`)).data

export const confirmScanList = async (
  eventId: string
): Promise<{ attended: number; noShows: number; credited: number }> =>
  (await api.post(`/attendance/events/${eventId}/confirm`)).data

export const markTicketPresent = async (ticketId: string): Promise<{ voided: number }> =>
  (await api.post(`/attendance/tickets/${ticketId}/mark-present`)).data

export const ATTENDANCE_LABELS: Record<Exclude<AttendanceStatus, null>, string> = {
  attended: 'Attended',
  no_show: 'No-show',
  cancelled_early: 'Cancelled early',
  excused: 'Event cancelled by TRFC',
}
