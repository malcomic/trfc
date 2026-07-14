import { useState } from 'react'
import { downloadTicket } from '../api/tickets'

interface TicketDownloadButtonProps {
  ticketId: string
  paymentStatus: 'pending' | 'paid' | 'failed'
  eventTitle?: string
  className?: string
}

export default function TicketDownloadButton({
  ticketId,
  paymentStatus,
  eventTitle = 'Event Ticket',
  className = '',
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

      await downloadTicket(ticketId)

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
        onClick={handleDownload}
        disabled={isLoading || !isDownloadable}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all duration-200 ease-in-out
          ${
            isDownloadable
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
          ${isLoading ? 'opacity-70' : ''}
        `}
        title={!isDownloadable ? `Payment pending - ${eventTitle}` : `Download ${eventTitle} ticket`}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Downloading...
          </>
        ) : success ? (
          <>
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              ></path>
            </svg>
            Downloaded!
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download Ticket
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <svg
            className="h-4 w-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            ></path>
          </svg>
          {error}
        </p>
      )}

      {!isDownloadable && !error && (
        <p className="mt-2 text-sm text-gray-500">
          Payment pending - Download available after payment confirmation
        </p>
      )}
    </div>
  )
}
