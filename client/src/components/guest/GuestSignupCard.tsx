import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  buildGuestLoginUrl,
  buildGuestSignupUrl,
  dismissGuestSignup,
  isGuestSignupDismissed,
  type GuestDetails,
} from '../../utils/guestSignup'

export type GuestPurchaseKind = 'ticket' | 'order' | 'medal' | 'hire'

interface GuestSignupCardProps extends GuestDetails {
  kind: GuestPurchaseKind
}

const BENEFITS = [
  'See all your tickets and orders in one place',
  'Give up a ticket from your dashboard before the 3-day deadline',
  'Check out faster next time',
]

export default function GuestSignupCard({ kind, ...details }: GuestSignupCardProps) {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(isGuestSignupDismissed)

  if (user || dismissed) return null

  const onDismiss = () => {
    dismissGuestSignup()
    setDismissed(true)
  }

  return (
    <section
      aria-labelledby="guest-signup-title"
      className="bg-ash light:bg-ash-light border border-accent/30 light:border-accent-light/30 border-l-4 border-l-accent light:border-l-accent-light p-6 mb-6 print:hidden"
    >
      <div className="flex items-center gap-2 mb-2">
        <UserPlus size={18} className="text-accent light:text-accent-light flex-shrink-0" aria-hidden="true" />
        <h2 id="guest-signup-title" className="font-bebas text-2xl tracking-wide m-0">
          Create your free TRFC account
        </h2>
      </div>
      <ul className="list-none m-0 p-0 mb-4 space-y-1.5">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-sm text-fog light:text-fog-light">
            <Check size={14} className="text-accent light:text-accent-light flex-shrink-0 mt-0.5" aria-hidden="true" />
            {benefit}
          </li>
        ))}
      </ul>
      {kind !== 'hire' && (
        <p className="text-sm text-chalk light:text-chalk-light m-0 mb-4">
          Use the same email and phone and this purchase will appear in your account.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          to={buildGuestSignupUrl(details)}
          className="inline-flex items-center gap-2 bg-cta text-cta-ink px-5 py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase no-underline hover:bg-cta/90"
        >
          Create account <ArrowRight size={16} />
        </Link>
        <Link
          to={buildGuestLoginUrl(details)}
          className="text-sm text-accent light:text-accent-light no-underline hover:underline"
        >
          Already have an account? Sign in
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto bg-transparent border-0 p-0 cursor-pointer text-sm text-fog light:text-fog-light hover:underline"
        >
          Not now
        </button>
      </div>
    </section>
  )
}
