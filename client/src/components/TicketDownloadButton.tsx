import { useState } from 'react'
import { Download, Loader, Check } from 'lucide-react'
import { downloadTicket } from '../api/tickets'

interface TicketDownloadButtonProps {
  ticketId: string
  paymentStatus: 'pending' | 'paid' | 'failed' | string
  eventTitle?: string
  className?: string
  /** Guest verification — email/phone used at checkout */
  verify?: { email?: string; phone?: string }
  compact?: boolean
}

export default function TicketDownloadButton({
  ticketId,
  paymentStatus,
  eventTitle = 'Event Ticket',
  className = '',
  verify,
  compact = false,
}: TicketDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isDownloadable = paymentStatus === 'paid'

  const handleDownload = async () => {
    if (!isDownloadable) {
      setError('Payment must be completed before downloading ticket')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setSuccess(false)
      await downloadTicket(ticketId, verify)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Download error:', err)
      setError(
        err.response?.data?.error ||
          err.message ||
          'Failed to download ticket. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isLoading || !isDownloadable}
        className={`
          inline-flex items-center justify-center gap-2 font-barlow-condensed font-black
          text-xs tracking-widest uppercase clip-angled transition-colors
          ${compact ? 'px-3 py-2' : 'px-4 py-2.5'}
          ${
            isDownloadable
              ? 'bg-accent light:bg-accent-light text-black light:text-white hover:bg-accent/90 light:hover:bg-accent-light/90 cursor-pointer'
              : 'bg-smoke text-fog cursor-not-allowed'
          }
          ${isLoading ? 'opacity-70' : ''}
        `}
        title={
          !isDownloadable
            ? `Payment pending - ${eventTitle}`
            : `Download ${eventTitle} ticket`
        }
      >
        {isLoading ? (
          <>
            <Loader className="h-3.5 w-3.5 animate-spin" />
            Downloading…
          </>
        ) : success ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Downloaded
          </>
        ) : (
          <>
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </>
        )}
      </button>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
