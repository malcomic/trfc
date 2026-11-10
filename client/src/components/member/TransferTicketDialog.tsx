import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Modal, Button } from '../ui'
import { transferTicket, type TicketTransferResult } from '../../api/membership'
import { MEMBERSHIP_COPY } from '../../content/membership'
import { inputField } from '../../utils/themeClasses'

interface TransferTicketDialogProps {
  ticket: { id: string; event_title: string } | null
  onClose: () => void
  onTransferred: (result: TicketTransferResult) => void
}

const copy = MEMBERSHIP_COPY.transfer

export default function TransferTicketDialog({ ticket, onClose, onTransferred }: TransferTicketDialogProps) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    setEmail('')
    setError('')
    onClose()
  }

  const confirm = async () => {
    if (!ticket) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter the email of the person getting the ticket')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const result = await transferTicket(ticket.id, email.trim())
      setEmail('')
      onTransferred(result)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not transfer this ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={!!ticket} onClose={submitting ? () => undefined : close} title={copy.title}>
      {ticket && (
        <div className="space-y-4 text-sm">
          <p className="text-chalk light:text-chalk-light font-semibold">{ticket.event_title}</p>
          <p className="text-fog light:text-fog-light">{copy.body}</p>
          <div>
            <label htmlFor="transfer-email" className="block font-semibold mb-1">
              {copy.emailLabel}
            </label>
            <input
              id="transfer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className={`w-full px-3 py-2 ${inputField}`}
              autoComplete="off"
            />
            <p className="text-xs text-fog light:text-fog-light mt-1">{copy.emailHelp}</p>
          </div>
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
              {submitting ? copy.sending : copy.confirm}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
