import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertCircle, ShieldCheck } from 'lucide-react'
import { CONSENT_REQUIRED_EVENT } from '../../api/index'
import { acceptConsent, getUserProfile } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui'
import LinkedText from './LinkedText'
import { useConsentCopy } from './useConsentCopy'

const EXEMPT_ROLES = new Set(['admin', 'scanner'])
const POLICY_PATHS = /^\/(privacy|terms)(\/|$)/
const LINKS = [
  { phrase: 'Privacy and Confidentiality Terms', to: '/privacy' },
  { phrase: 'Terms', to: '/terms' },
]

function Check({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer text-sm text-chalk light:text-chalk-light leading-relaxed">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 mt-0.5 flex-none cursor-pointer accent-white light:accent-black"
      />
      <span>{children}</span>
    </label>
  )
}

/**
 * Asks a signed-in member to agree again after a big policy change (or for the first time, for
 * accounts made before consent was recorded), and shows the marketing email box once, unticked.
 */
export default function ConsentGate() {
  const { user, updateUser, logout } = useAuth()
  const { pathname } = useLocation()
  const copy = useConsentCopy('privacy-members')
  const [agreed, setAgreed] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onRequired = () => {
      getUserProfile()
        .then((profile) => updateUser(profile))
        .catch(() => {})
    }
    window.addEventListener(CONSENT_REQUIRED_EVENT, onRequired)
    return () => window.removeEventListener(CONSENT_REQUIRED_EVENT, onRequired)
  }, [updateUser])

  if (!user || EXEMPT_ROLES.has(user.role) || POLICY_PATHS.test(pathname)) return null
  const needsConsent = !!user.needs_consent
  const needsMarketing = !!user.needs_marketing_prompt
  if (!needsConsent && !needsMarketing) return null

  const canSubmit = !saving && (!needsConsent || (agreed && ageConfirmed && !!copy.version))

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      await acceptConsent(
        needsConsent
          ? { acceptTerms: agreed, ageConfirmed, policyVersion: copy.version ?? '', marketingOptIn: marketing }
          : { marketingOptIn: marketing }
      )
      const profile = await getUserProfile()
      updateUser(profile)
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError('The terms were just updated. Please refresh the page to read the latest version.')
      } else {
        setError(err?.response?.data?.error || 'Could not save your answer. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="consent-gate-title">
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-ash light:bg-ash-light border border-mist light:border-mist-light rounded-xl p-6 md:p-8 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-accent light:text-accent-light flex-none" />
          <h2 id="consent-gate-title" className="m-0 text-2xl font-barlow-condensed font-bold text-chalk light:text-chalk-light">
            {needsConsent ? 'Please review our terms' : 'Stay in the loop?'}
          </h2>
        </div>

        {needsConsent ? (
          <p className="m-0 text-sm text-fog light:text-fog-light">
            We have updated how TRFC handles your information
            {copy.version ? ` (version ${copy.version})` : ''}. Please read the terms and agree to keep using your account.
          </p>
        ) : (
          <p className="m-0 text-sm text-fog light:text-fog-light">
            Choose whether you want promotion emails from TRFC. You can change this any time from your dashboard.
          </p>
        )}

        <div className="flex flex-col gap-3.5">
          {needsConsent && (
            <>
              <Check id="consent-terms" checked={agreed} onChange={setAgreed}>
                <LinkedText text={copy.box1} links={LINKS} />
              </Check>
              <Check id="consent-age" checked={ageConfirmed} onChange={setAgeConfirmed}>
                {copy.ageBox}
              </Check>
            </>
          )}
          {needsMarketing && (
            <Check id="consent-marketing" checked={marketing} onChange={setMarketing}>
              {copy.box2} <span className="text-fog light:text-fog-light">(Optional)</span>
            </Check>
          )}
        </div>

        {(error || (needsConsent && copy.loadFailed)) && (
          <p className="m-0 flex items-start gap-2 text-sm text-red-500" role="alert">
            <AlertCircle size={15} className="flex-none mt-0.5" />
            {error || 'We could not load the terms. Please refresh the page.'}
          </p>
        )}

        <div className="flex flex-wrap gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            Log out
          </Button>
          <Button size="sm" onClick={submit} disabled={!canSubmit} isLoading={saving}>
            {needsConsent ? 'Agree and continue' : 'Save my choice'}
          </Button>
        </div>
      </div>
    </div>
  )
}
