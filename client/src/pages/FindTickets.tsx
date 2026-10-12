import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { findTickets, updateTicketEmail, FoundTickets } from '../api/events'
import { formatEventDateTime } from '../utils/eventDate'
import { pageRoot } from '../utils/themeClasses'

const inputClass =
  'w-full bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 px-4 py-3 text-chalk light:text-chalk-light focus:outline-none focus:border-accent light:focus:border-accent-light'
const primaryButtonClass =
  'w-full bg-accent light:bg-accent-light text-black light:text-white py-3 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90 disabled:opacity-60'
const secondaryButtonClass =
  'w-full border border-white/15 light:border-black/15 py-3 font-barlow-condensed font-black text-sm tracking-widest uppercase text-chalk light:text-chalk-light hover:border-accent light:hover:border-accent-light disabled:opacity-60'

export default function FindTickets() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [receipt, setReceipt] = useState('')
  const [found, setFound] = useState<FoundTickets | null>(null)
  const [verifiedPhone, setVerifiedPhone] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFind = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedPhone = phone.replace(/\s+/g, '')
    const normalizedReceipt = receipt.replace(/\s+/g, '').toUpperCase()

    if (!/^254\d{9}$/.test(normalizedPhone)) {
      setError('Enter a valid phone number (254XXXXXXXXX)')
      return
    }
    if (!normalizedReceipt) {
      setError('Enter the M-Pesa code from your payment SMS')
      return
    }

    try {
      setLoading(true)
      setError('')
      const result = await findTickets({ phone: normalizedPhone, mpesaReceipt: normalizedReceipt })
      setFound(result)
      setVerifiedPhone(normalizedPhone)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not look up your tickets')
    } finally {
      setLoading(false)
    }
  }

  const handleViewTickets = () => {
    if (!found) return
    const params = new URLSearchParams({ phone: verifiedPhone })
    navigate(`/ticket-confirmation/${encodeURIComponent(found.checkoutRequestId)}?${params.toString()}`)
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!found) return
    const normalizedEmail = newEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address')
      return
    }

    try {
      setLoading(true)
      setError('')
      const result = await updateTicketEmail({ token: found.token, email: normalizedEmail })
      setSentTo(result.maskedEmail || normalizedEmail)
      setFound({ ...found, maskedEmail: result.maskedEmail })
      setShowEmailForm(false)
      setNewEmail('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not send your tickets')
    } finally {
      setLoading(false)
    }
  }

  const startOver = () => {
    setFound(null)
    setShowEmailForm(false)
    setSentTo(null)
    setError('')
  }

  return (
    <div className={`${pageRoot} py-16 px-6`}>
      <div className="max-w-md mx-auto bg-ash light:bg-ash-light border border-white/5 light:border-black/8 p-8">
        <h1 className="font-bebas text-4xl mb-2">
          FIND MY <span className="text-accent light:text-accent-light">TICKETS</span>
        </h1>

        {error && (
          <div className="flex items-start gap-2 text-red-400 text-sm mb-4">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!found ? (
          <>
            <p className="text-fog light:text-fog-light text-sm mb-6">
              Lost your ticket email or link? Enter the M-Pesa phone number you paid with and the M-Pesa code from
              your payment SMS.
            </p>
            <form onSubmit={handleFind} className="space-y-4">
              <div>
                <label className="block text-xs font-barlow-condensed font-bold tracking-widest uppercase mb-1.5">
                  M-Pesa phone number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="254712345678"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-barlow-condensed font-bold tracking-widest uppercase mb-1.5">
                  M-Pesa code
                </label>
                <input
                  type="text"
                  value={receipt}
                  onChange={(e) => setReceipt(e.target.value)}
                  placeholder="SJK4ABCDEF"
                  autoCapitalize="characters"
                  className={`${inputClass} uppercase`}
                />
                <p className="text-xs text-fog light:text-fog-light mt-1">
                  From your M-Pesa confirmation SMS, e.g. SJK4ABCDEF.
                </p>
              </div>
              <button type="submit" disabled={loading} className={primaryButtonClass}>
                {loading ? 'Searching…' : 'Find Tickets'}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-5">
            <div className="border border-white/10 light:border-black/10 p-4">
              <p className="font-barlow-condensed font-bold text-lg m-0">{found.eventTitle}</p>
              <p className="text-fog light:text-fog-light text-sm m-0">{formatEventDateTime(found.eventDate)}</p>
              <p className="text-sm mt-2 mb-0">
                {found.quantity} ticket{found.quantity === 1 ? '' : 's'}
                {found.maskedEmail ? ` · sent to ${found.maskedEmail}` : ''}
              </p>
            </div>

            {sentTo && (
              <div className="flex items-start gap-2 text-green-400 text-sm">
                <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>Your tickets have been sent to {sentTo}.</span>
              </div>
            )}

            <button type="button" onClick={handleViewTickets} className={primaryButtonClass}>
              View Tickets
            </button>

            {showEmailForm ? (
              <form onSubmit={handleSendEmail} className="space-y-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
                <button type="submit" disabled={loading} className={secondaryButtonClass}>
                  {loading ? 'Sending…' : 'Send Tickets To This Email'}
                </button>
              </form>
            ) : (
              <button type="button" onClick={() => setShowEmailForm(true)} className={secondaryButtonClass}>
                Send To A Different Email
              </button>
            )}

            <button
              type="button"
              onClick={startOver}
              className="w-full text-xs font-barlow-condensed font-bold tracking-widest uppercase text-fog light:text-fog-light hover:text-accent light:hover:text-accent-light"
            >
              Look up another purchase
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
