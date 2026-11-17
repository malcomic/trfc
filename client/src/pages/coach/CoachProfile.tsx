import { useEffect, useState } from 'react'
import { Loader } from 'lucide-react'
import { getCoachMe, type CoachMe } from '../../api/coaches'
import { useAuth } from '../../context/AuthContext'

export default function CoachProfile() {
  const { logout } = useAuth()
  const [me, setMe] = useState<CoachMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getCoachMe()
      .then((row) => !cancelled && setMe(row))
      .catch(() => !cancelled && setError('Could not load your profile.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="m-0 font-bebas text-4xl text-chalk light:text-chalk-light">Settings</h1>
        <p className="m-0 mt-2 font-barlow text-fog light:text-fog-light">
          Your coach account details. Program assignments are managed by an admin.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-fog light:text-fog-light font-barlow">
          <Loader className="animate-spin" size={18} /> Loading…
        </div>
      )}
      {error && <p className="m-0 text-red-500 font-barlow text-sm">{error}</p>}

      {me && (
        <dl className="m-0 space-y-4 font-barlow">
          <div>
            <dt className="text-xs uppercase tracking-widest text-fog light:text-fog-light">Name</dt>
            <dd className="m-0 mt-1 text-chalk light:text-chalk-light font-semibold">{me.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-fog light:text-fog-light">Email</dt>
            <dd className="m-0 mt-1 text-chalk light:text-chalk-light font-semibold">{me.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-fog light:text-fog-light">Phone</dt>
            <dd className="m-0 mt-1 text-chalk light:text-chalk-light font-semibold">{me.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-fog light:text-fog-light">Assigned programs</dt>
            <dd className="m-0 mt-1 text-chalk light:text-chalk-light font-semibold">{me.assignedProgramCount}</dd>
          </div>
        </dl>
      )}

      <button
        type="button"
        onClick={() => logout()}
        className="px-4 min-h-[44px] font-barlow-condensed font-bold tracking-widest uppercase border border-white/20 light:border-black/20 text-chalk light:text-chalk-light"
      >
        Sign out
      </button>
    </div>
  )
}
