import { FormEvent, useState } from 'react'
import { joinEventWaitlist } from '../api/events'
import { useAuth } from '../context/AuthContext'
import { inputField } from '../utils/themeClasses'

/** Shown when no seats are open to this viewer: we tell them when one opens. */
export default function WaitlistForm({ eventId }: { eventId: string }) {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [joined, setJoined] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const result = await joinEventWaitlist(eventId, { name, email, phone })
      setJoined(true)
      setMessage(`You're on the waiting list (number ${result.position}). We'll message you when a seat opens.`)
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Could not join the waiting list. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (joined) return <p className="text-sm text-green-400">{message}</p>

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-fog light:text-fog-light">No seats are open right now. Join the waiting list.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={`px-3 py-2 text-sm ${inputField}`} />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className={`px-3 py-2 text-sm ${inputField}`}
        />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={`px-3 py-2 text-sm ${inputField}`} />
      </div>
      {message && <p className="text-xs text-red-300">{message}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full border border-accent light:border-accent-light text-accent light:text-accent-light py-3 font-barlow-condensed font-bold text-sm tracking-widest uppercase disabled:opacity-50"
      >
        {submitting ? 'Joining…' : 'Join the waiting list'}
      </button>
    </form>
  )
}
