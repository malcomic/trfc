import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { activateCoachInvite, validateCoachInvite } from '../api/coachInvitations'
import AuthLayout, { AuthAlert, BackToSignIn } from '../components/AuthLayout'
import { Button, FormInput, PasswordToggle } from '../components/ui'
import LinkedText from '../components/policy/LinkedText'
import { useConsentCopy } from '../components/policy/useConsentCopy'
import { getPasswordStrength } from '../utils/passwordStrength'

interface ActivateForm {
  phone: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

const STRENGTH_COLORS = {
  weak: { bar: 'bg-red-500', text: 'text-red-500' },
  fair: { bar: 'bg-amber-500', text: 'text-amber-500' },
  strong: { bar: 'bg-green-500', text: 'text-green-500' },
} as const

const PHONE_PATTERN = /^(?:\+?254|0)?[17]\d{8}$/

export default function CoachActivate() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const terms = useConsentCopy('terms')
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ActivateForm>({
    defaultValues: { phone: '', password: '', confirmPassword: '', acceptTerms: false },
  })
  const [loadingPreview, setLoadingPreview] = useState(Boolean(token))
  const [previewError, setPreviewError] = useState('')
  const [preview, setPreview] = useState<{ fullName: string; email: string; phone: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const passwordValue = watch('password', '')
  const strength = getPasswordStrength(passwordValue)
  const strengthColors = strength.cls ? STRENGTH_COLORS[strength.cls] : null

  useEffect(() => {
    if (!token) return
    let cancelled = false
    validateCoachInvite(token)
      .then((data) => {
        if (cancelled) return
        setPreview({ fullName: data.fullName, email: data.email, phone: data.phone })
        setValue('phone', data.phone)
      })
      .catch((err) => {
        if (cancelled) return
        setPreviewError(err.response?.data?.error || 'This invitation link is invalid or has expired.')
      })
      .finally(() => !cancelled && setLoadingPreview(false))
    return () => {
      cancelled = true
    }
  }, [token, setValue])

  const onSubmit = async (data: ActivateForm) => {
    if (!terms.version) {
      setErrorMessage('The terms could not be loaded. Please refresh and try again.')
      return
    }
    try {
      setSubmitting(true)
      setErrorMessage('')
      const result = await activateCoachInvite({
        token,
        password: data.password,
        phone: data.phone,
        acceptTerms: data.acceptTerms,
        policyVersion: terms.version,
      })
      navigate(`/login?email=${encodeURIComponent(result.email)}`, { replace: true })
    } catch (error: any) {
      setErrorMessage(
        error.response?.status === 429
          ? 'Too many attempts. Please wait a few minutes and try again.'
          : error.response?.data?.error || 'Could not activate your account.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout
        eyebrow="Coach activation"
        title={
          <>
            INVALID
            <br />
            LINK
          </>
        }
        intro="This activation link is missing. Open the link from your approval email, or ask the admin for a new invite."
      >
        <BackToSignIn />
      </AuthLayout>
    )
  }

  if (loadingPreview) {
    return (
      <AuthLayout
        eyebrow="Coach activation"
        title={
          <>
            CHECKING
            <br />
            INVITE
          </>
        }
        intro="One moment…"
      >
        <p className="text-fog light:text-fog-light font-barlow">Validating your invitation…</p>
      </AuthLayout>
    )
  }

  if (previewError || !preview) {
    return (
      <AuthLayout
        eyebrow="Coach activation"
        title={
          <>
            LINK
            <br />
            EXPIRED
          </>
        }
        intro={previewError || 'This invitation is no longer valid. Ask the admin to resend your invite.'}
      >
        <BackToSignIn />
      </AuthLayout>
    )
  }

  const toggle = <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />

  return (
    <AuthLayout
      eyebrow="Coach activation"
      title={
        <>
          CREATE YOUR
          <br />
          COACH ACCOUNT
        </>
      }
      intro="Confirm your details, choose a password, and accept the terms. Then sign in to your coach workspace."
    >
      {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormInput label="Name" value={preview.fullName} disabled readOnly />
        <FormInput label="Email" value={preview.email} disabled readOnly />
        <FormInput
          label="Phone"
          error={errors.phone?.message}
          {...register('phone', {
            required: 'Phone is required',
            validate: (value) =>
              PHONE_PATTERN.test(value.replace(/[\s-]/g, '')) || 'Enter a valid Kenyan phone number',
          })}
        />
        <div>
          <FormInput
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            endAdornment={toggle}
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
            })}
          />
          {strengthColors && (
            <p className={`mt-1 text-xs font-barlow ${strengthColors.text}`}>Strength: {strength.label}</p>
          )}
        </div>
        <FormInput
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Confirm your password',
            validate: (value) => value === watch('password') || 'Passwords do not match',
          })}
        />

        <label className="flex items-start gap-3 text-sm font-barlow text-fog light:text-fog-light">
          <input type="checkbox" className="mt-1" {...register('acceptTerms', { required: 'Please agree to the Terms' })} />
          <span>
            <LinkedText
              text="I agree to the Terms for coaching with TRFC."
              links={[{ phrase: 'Terms', to: '/terms' }]}
            />
            {errors.acceptTerms && <span className="block text-red-500 mt-1">{errors.acceptTerms.message}</span>}
          </span>
        </label>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          className="h-13"
          disabled={submitting || terms.loadFailed}
        >
          {submitting ? 'Activating…' : 'Activate coach account'}
        </Button>
        <p className="text-center text-sm font-barlow text-fog light:text-fog-light">
          Already activated?{' '}
          <Link to="/login" className="font-bold underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
