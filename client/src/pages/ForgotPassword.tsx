import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { MailCheck } from 'lucide-react'
import { requestPasswordReset } from '../api/auth'
import { Button, FormInput } from '../components/ui'
import AuthLayout, { AuthAlert, BackToSignIn } from '../components/AuthLayout'

interface ForgotPasswordForm {
  email: string
}

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)

  const onSubmit = async ({ email }: ForgotPasswordForm) => {
    try {
      setLoading(true)
      setErrorMessage('')
      await requestPasswordReset(email.trim())
      setSentTo(email.trim())
    } catch (error: any) {
      setErrorMessage(
        error.response?.status === 429
          ? 'Too many reset requests. Please wait a few minutes and try again.'
          : error.response?.data?.error || 'Could not send a reset link. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (sentTo) {
    return (
      <AuthLayout
        eyebrow="Password Reset"
        title={<>CHECK YOUR<br />INBOX</>}
        intro={
          <>
            If an account exists for <strong className="text-chalk light:text-chalk-light">{sentTo}</strong>, we&apos;ve sent a link to reset your password. It expires in 1 hour.
          </>
        }
      >
        <div className="flex items-start gap-3 bg-accent/10 light:bg-accent-light/10 border border-accent/25 light:border-accent-light/25 px-4 py-3.5 text-sm text-fog light:text-fog-light">
          <MailCheck size={18} className="flex-shrink-0 text-accent light:text-accent-light mt-0.25" />
          <span>Didn&apos;t get it? Check your spam folder, or try again in a few minutes.</span>
        </div>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="mt-6 bg-transparent border-0 p-0 cursor-pointer font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light hover:text-accent light:hover:text-accent-light transition-colors duration-200"
        >
          Use a different email
        </button>
        <BackToSignIn />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      eyebrow="Password Reset"
      title={<>FORGOT YOUR<br />PASSWORD?</>}
      intro="Enter the email you signed up with and we'll send you a link to choose a new password."
    >
      {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-8">
          <FormInput
            label="Email Address"
            id="forgot-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
            })}
          />
        </div>

        <Button type="submit" disabled={loading} isLoading={loading} variant="primary" size="lg" fullWidth className="h-13">
          Send Reset Link
        </Button>
      </form>

      <BackToSignIn />
    </AuthLayout>
  )
}
