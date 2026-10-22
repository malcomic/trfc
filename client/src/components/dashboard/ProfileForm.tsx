import { FormEvent, useState } from 'react'
import { AlertCircle, KeyRound, UserRound } from 'lucide-react'
import { changeMyPassword, updateMyProfile } from '../../api/auth'
import type { MemberProfile } from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import { Button, FormCheckbox, FormInput, PasswordToggle } from '../ui'
import { getPasswordStrength } from '../../utils/passwordStrength'
import { cardSurface } from '../../utils/themeClasses'

const STRENGTH_COLORS = {
  weak: { bar: 'bg-red-500', text: 'text-red-500' },
  fair: { bar: 'bg-amber-500', text: 'text-amber-500' },
  strong: { bar: 'bg-green-500', text: 'text-green-500' },
} as const

interface ProfileFormProps {
  profile: MemberProfile
  onSaved: (profile: MemberProfile) => void
  notify: (type: 'success' | 'error', title: string, message?: string) => void
}

function FormError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  )
}

function CardTitle({ icon: Icon, title, subtitle }: { icon: typeof UserRound; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <Icon size={20} className="text-accent light:text-accent-light mt-1" />
      <div>
        <h2 className="font-barlow-condensed font-bold text-xl tracking-tighter">{title}</h2>
        <p className="text-sm text-fog light:text-fog-light">{subtitle}</p>
      </div>
    </div>
  )
}

export default function ProfileForm({ profile, onSaved, notify }: ProfileFormProps) {
  const { updateUser, setTokens } = useAuth()

  const [details, setDetails] = useState({
    name: profile.name ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    whatsapp: profile.whatsapp ?? '',
    marketingOptIn: profile.marketing_opt_in === true,
  })
  const [savingDetails, setSavingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const strength = getPasswordStrength(passwords.next)
  const strengthColors = strength.cls ? STRENGTH_COLORS[strength.cls] : null

  const saveDetails = async (e: FormEvent) => {
    e.preventDefault()
    setDetailsError('')
    setSavingDetails(true)
    try {
      const { user, token, refreshToken } = await updateMyProfile({
        name: details.name,
        email: details.email,
        phone: details.phone,
        whatsapp: details.whatsapp,
        marketingOptIn: details.marketingOptIn,
      })
      setTokens(token, refreshToken)
      updateUser(user)
      onSaved({ ...profile, ...user } as MemberProfile)
      notify('success', 'Profile updated')
    } catch (err: any) {
      setDetailsError(err.response?.data?.error || 'Failed to update your profile')
    } finally {
      setSavingDetails(false)
    }
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    if (passwords.next !== passwords.confirm) {
      setPasswordError('The new passwords do not match')
      return
    }
    setSavingPassword(true)
    try {
      const { token, refreshToken } = await changeMyPassword({
        currentPassword: passwords.current,
        newPassword: passwords.next,
      })
      setTokens(token, refreshToken)
      setPasswords({ current: '', next: '', confirm: '' })
      notify('success', 'Password changed', 'Other devices have been signed out.')
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Could not change your password')
    } finally {
      setSavingPassword(false)
    }
  }

  const toggle = <PasswordToggle visible={showPasswords} onToggle={() => setShowPasswords((v) => !v)} />
  const passwordType = showPasswords ? 'text' : 'password'

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      <form onSubmit={saveDetails} className={`${cardSurface} p-6 space-y-4`}>
        <CardTitle icon={UserRound} title="Your details" subtitle="Keep your contact information up to date." />
        <FormInput
          label="Full name"
          required
          value={details.name}
          onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))}
          autoComplete="name"
        />
        <FormInput
          label="Email"
          type="email"
          required
          value={details.email}
          onChange={(e) => setDetails((d) => ({ ...d, email: e.target.value }))}
          autoComplete="email"
        />
        <FormInput
          label="Phone"
          type="tel"
          required
          value={details.phone}
          onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))}
          autoComplete="tel"
          placeholder="07XX XXX XXX"
        />
        <FormInput
          label="WhatsApp"
          type="tel"
          value={details.whatsapp}
          onChange={(e) => setDetails((d) => ({ ...d, whatsapp: e.target.value }))}
          placeholder="Leave blank to use your phone number"
        />
        <FormCheckbox
          label="Send me news, events and offers on WhatsApp"
          checked={details.marketingOptIn}
          onChange={(e) => setDetails((d) => ({ ...d, marketingOptIn: e.target.checked }))}
        />
        <FormError message={detailsError} />
        <Button type="submit" isLoading={savingDetails}>
          Save changes
        </Button>
      </form>

      <form onSubmit={savePassword} className={`${cardSurface} p-6 space-y-4`}>
        <CardTitle icon={KeyRound} title="Change password" subtitle="Changing it signs you out on other devices." />
        <FormInput
          label="Current password"
          type={passwordType}
          required
          value={passwords.current}
          onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
          autoComplete="current-password"
          endAdornment={toggle}
        />
        <div>
          <FormInput
            label="New password"
            type={passwordType}
            required
            minLength={8}
            value={passwords.next}
            onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
            autoComplete="new-password"
            endAdornment={toggle}
          />
          {strengthColors && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 h-0.75 rounded-full transition-all duration-300 ${
                      strength.score >= i ? strengthColors.bar : 'bg-mist light:bg-mist-light'
                    }`}
                  />
                ))}
              </div>
              <span className={`font-barlow-condensed font-bold text-xs tracking-widest uppercase ${strengthColors.text}`}>
                {strength.label} password
              </span>
            </div>
          )}
        </div>
        <FormInput
          label="Confirm new password"
          type={passwordType}
          required
          value={passwords.confirm}
          onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
          autoComplete="new-password"
          endAdornment={toggle}
        />
        <FormError message={passwordError} />
        <Button type="submit" isLoading={savingPassword}>
          Update password
        </Button>
      </form>
    </div>
  )
}
