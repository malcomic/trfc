import { useState } from 'react'
import { AlertCircle, CheckCircle2, Link2 } from 'lucide-react'
import { linkGoogle, unlinkGoogle } from '../../api/auth'
import type { MemberProfile } from '../../api/users'
import { Button } from '../ui'
import GoogleButton, { isGoogleEnabled } from '../auth/GoogleButton'
import { cardSurface } from '../../utils/themeClasses'

interface ConnectedAccountsCardProps {
  profile: MemberProfile
  onSaved: (profile: MemberProfile) => void
  notify: (type: 'success' | 'error', title: string, message?: string) => void
}

const GOOGLE_ROLES_BLOCKED = ['admin', 'scanner']

export default function ConnectedAccountsCard({ profile, onSaved, notify }: ConnectedAccountsCardProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!isGoogleEnabled || GOOGLE_ROLES_BLOCKED.includes(profile.role)) return null

  const linked = profile.google_linked === true
  const canUnlink = profile.has_password !== false

  const run = async (action: () => Promise<{ user: Partial<MemberProfile> }>, successTitle: string) => {
    setBusy(true)
    setError('')
    try {
      const { user } = await action()
      onSaved({ ...profile, ...user })
      notify('success', successTitle)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`${cardSurface} p-6 space-y-4 mt-6`}>
      <div className="flex items-start gap-3">
        <Link2 size={20} className="text-accent light:text-accent-light mt-1" />
        <div>
          <h2 className="font-barlow-condensed font-bold text-xl tracking-tighter">Connected accounts</h2>
          <p className="text-sm text-fog light:text-fog-light">Sign in faster with your Google account.</p>
        </div>
      </div>

      {linked ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm">
            <CheckCircle2 size={16} className="text-green-500" /> Google account connected
          </span>
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              variant="secondary"
              isLoading={busy}
              disabled={!canUnlink}
              onClick={() => run(unlinkGoogle, 'Google account disconnected')}
            >
              Disconnect
            </Button>
            {!canUnlink && <span className="text-xs text-fog light:text-fog-light">Set a password first</span>}
          </div>
        </div>
      ) : (
        <div className={busy ? 'opacity-60 pointer-events-none max-w-xs' : 'max-w-xs'} aria-busy={busy}>
          <GoogleButton
            text="continue_with"
            width={280}
            onCredential={(credential) => run(() => linkGoogle(credential), 'Google account connected')}
            onError={() => setError('Google sign-in was cancelled or failed. Please try again.')}
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
