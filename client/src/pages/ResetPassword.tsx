import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import { Button, FormInput, PasswordToggle } from '../components/ui'
import AuthLayout, { AuthAlert, BackToSignIn } from '../components/AuthLayout'
import { getPasswordStrength } from '../utils/passwordStrength'

interface ResetPasswordForm {
  password: string
  confirmPassword: string
}

const STRENGTH_COLORS = {
  weak: { bar: 'bg-red-500', text: 'text-red-500' },
  fair: { bar: 'bg-amber-500', text: 'text-amber-500' },
  strong: { bar: 'bg-green-500', text: 'text-green-500' },
} as const

function RequestNewLink() {
  return (
    <Link to="/forgot-password" className="font-bold underline text-current">
      Request a new link
    </Link>
  )
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const { register, handleSubmit, watch, getValues, formState: { errors } } = useForm<ResetPasswordForm>()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [linkInvalid, setLinkInvalid] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const passwordValue = watch('password', '')
  const strength = getPasswordStrength(passwordValue)
  const strengthColors = strength.cls ? STRENGTH_COLORS[strength.cls] : null

  const onSubmit = async ({ password }: ResetPasswordForm) => {
    try {
      setLoading(true)
      setErrorMessage('')
      await resetPassword(token, password)
      navigate('/login?reset=success', { replace: true })
    } catch (error: any) {
      const message: string | undefined = error.response?.data?.error
      if (error.response?.status === 400 && message?.includes('reset link')) {
        setLinkInvalid(true)
      }
      setErrorMessage(
        error.response?.status === 429
          ? 'Too many attempts. Please wait a few minutes and try again.'
          : message || 'Could not reset your password. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout
        eyebrow="Password Reset"
        title={<>INVALID<br />LINK</>}
        intro="This password reset link is missing or incomplete. Open the link from your email again, or request a new one."
      >
        <Button type="button" variant="primary" size="lg" fullWidth className="h-13" onClick={() => navigate('/forgot-password')}>
          Request a New Link
        </Button>
        <BackToSignIn />
      </AuthLayout>
    )
  }

  const toggle = <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />

  return (
    <AuthLayout
      eyebrow="Password Reset"
      title={<>CHOOSE A NEW<br />PASSWORD</>}
      intro="Pick a password you haven't used here before. You'll be signed out on other devices."
    >
      {errorMessage && (
        <AuthAlert tone="error">
          {errorMessage}
          {linkInvalid && (
            <>
              {' '}
              <RequestNewLink />.
            </>
          )}
        </AuthAlert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-6">
          <FormInput
            label="New Password"
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            error={errors.password?.message}
            endAdornment={toggle}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'At least 8 characters' },
              deps: ['confirmPassword'],
            })}
          />
          {passwordValue && strengthColors && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
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

        <div className="mb-8">
          <FormInput
            label="Confirm New Password"
            id="reset-confirm-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            endAdornment={toggle}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === getValues('password') || 'Passwords do not match',
            })}
          />
        </div>

        <Button type="submit" disabled={loading} isLoading={loading} variant="primary" size="lg" fullWidth className="h-13">
          Reset Password
        </Button>
      </form>

      <BackToSignIn />
    </AuthLayout>
  )
}
