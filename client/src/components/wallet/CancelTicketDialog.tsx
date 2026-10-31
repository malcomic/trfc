import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Modal, Button } from '../ui'
import { TICKET_VALUE_NOTE, cancelTicket, type CancelTicketResult } from '../../api/wallet'
import { formatKes } from '../../utils/captainDisplay'

export interface CancellableTicket {
  id: string
  event_title: string
  payment_status: string
  cancel_credit_amount?: number
  cancel_notice_status?: 'cancelled_early' | 'no_show' | null
}

interface CancelTicketDialogProps {
  ticket: CancellableTicket | null
  onClose: () => void
  onCancelled: (result: CancelTicketResult) => void
}

export default function CancelTicketDialog({ ticket, onClose, onCancelled }: CancelTicketDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    setError('')
    onClose()
  }

  const confirm = async () => {
    if (!ticket) return
    setSubmitting(true)
    setError('')
    try {
      onCancelled(await cancelTicket(ticket.id))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not record this. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const credit = Number(ticket?.cancel_credit_amount ?? 0)
  const isPlan = ticket?.payment_status === 'reserved'
  const late = ticket?.cancel_notice_status === 'no_show'

  return (
    <Modal isOpen={!!ticket} onClose={submitting ? () => undefined : close} title="Can't make it?">
      {ticket && (
        <div className="space-y-4 text-sm">
          <p className="text-chalk light:text-chalk-light font-semibold">{ticket.event_title}</p>
          {late ? (
            <p className="text-fog light:text-fog-light">
              The event is less than 24 hours away, so this is recorded as a <strong>no-show</strong>. You still get{' '}
              <strong className="text-chalk light:text-chalk-light">{formatKes(credit)}</strong> of ticket value. It appears
              the morning after the event and lasts 60 days.
            </p>
          ) : (
            <p className="text-fog light:text-fog-light">
              Thanks for telling us early. This is recorded as <strong>cancelled early</strong>, and{' '}
              <strong className="text-chalk light:text-chalk-light">{formatKes(credit)}</strong> becomes ticket value you
              can use straight away, for 60 days after the event.
            </p>
          )}
          <p className="text-xs text-fog light:text-fog-light">{TICKET_VALUE_NOTE}</p>
          {isPlan && (
            <p className="text-amber-400">
              This ticket is being paid in parts. Every ticket in this booking is released, and what you've paid becomes
              ticket value.
            </p>
          )}
          {error && (
            <div className="flex gap-2 bg-red-500/10 border border-red-500/20 p-3 text-red-400">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={close} disabled={submitting}>
              Keep ticket
            </Button>
            <Button onClick={confirm} isLoading={submitting}>
              I can't make it
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
