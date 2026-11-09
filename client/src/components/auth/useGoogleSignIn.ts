import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { googleAuth, type GoogleSignupProfile } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'

const PENDING_KEY = 'trfc_google_signup'

export interface PendingGoogleSignup {
  signupToken: string
  profile: GoogleSignupProfile
}

export function savePendingGoogleSignup(pending: PendingGoogleSignup) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
}

export function readPendingGoogleSignup(): PendingGoogleSignup | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?.signupToken && parsed?.profile?.email ? parsed : null
  } catch {
    return null
  }
}

export function clearPendingGoogleSignup() {
  sessionStorage.removeItem(PENDING_KEY)
}

interface Options {
  /** Where to go after signing in, given the user's role. */
  redirectFor: (role?: string) => string
  /** Query string (including "?") carried over to the profile-completion page. */
  completeSearch?: string
  onLinkRequired?: (email?: string) => void
}

export function useGoogleSignIn({ redirectFor, completeSearch = '', onLinkRequired }: Options) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState('')

  const handleCredential = async (credential: string) => {
    try {
      setGoogleLoading(true)
      setGoogleError('')
      const response = await googleAuth(credential)
      if (response.needsProfile) {
        savePendingGoogleSignup({ signupToken: response.signupToken, profile: response.profile })
        navigate(`/register/complete${completeSearch}`)
        return
      }
      clearPendingGoogleSignup()
      login(response.token, response.user, response.refreshToken)
      const linked = response.linked_purchases ?? 0
      navigate(redirectFor(response.user.role), linked > 0 ? { state: { linked } } : undefined)
    } catch (error: any) {
      const data = error?.response?.data
      setGoogleError(data?.error || 'Google sign-in failed. Please try again.')
      if (data?.code === 'GOOGLE_LINK_REQUIRED') onLinkRequired?.(data.email)
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleGoogleError = () => setGoogleError('Google sign-in was cancelled or failed. Please try again.')

  return { handleCredential, handleGoogleError, googleLoading, googleError }
}
