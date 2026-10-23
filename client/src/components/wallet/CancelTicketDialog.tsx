import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Modal, Button } from '../ui'
import { cancelTicket } from '../../api/wallet'
import { formatKes } from '../../utils/captainDisplay'

export interface CancellableTicket {
  id: string
  event_title: string
  payment_status: string
  cancel_credit_amount?: number
}

interface CancelTicketDialogProps {
  ticket: CancellableTicket | null
  onClose: () => void
  onCancelled: (result: { credited: number; balance: number; cancelledTicketIds: string[] }) => void
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
      setError(err.response?.data?.error || 'Could not cancel this ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const credit = Number(ticket?.cancel_credit_amount ?? 0)
  const isPlan = ticket?.payment_status === 'reserved'

  return (
    <Modal isOpen={!!ticket} onClose={submitting ? () => undefined : close} title="Cancel ticket?">
      {ticket && (
        <div className="space-y-4 text-sm">
          <p className="text-chalk light:text-chalk-light font-semibold">{ticket.event_title}</p>
          <p className="text-fog light:text-fog-light">
            No refund. <strong className="text-chalk light:text-chalk-light">{formatKes(credit)}</strong> will be added to
            your wallet for future events. You can cancel one ticket per month.
          </p>
          {isPlan && (
            <p className="text-amber-400">
              This ticket is on an installment plan. Cancelling it cancels the whole plan and releases every ticket on it.
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
              Cancel ticket
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
