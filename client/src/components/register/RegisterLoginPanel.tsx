import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { loginUser } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { safeRedirect } from '../../utils/safeRedirect'
import { PasswordToggle } from '../ui'
import GoogleButton, { isGoogleEnabled } from '../auth/GoogleButton'
import { useGoogleSignIn } from '../auth/useGoogleSignIn'

const inputClass =
  'w-full bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light placeholder:text-fog/70 light:placeholder:text-fog-light/70 font-barlow text-base py-3.5 px-4 outline-none transition-all duration-200 focus:border-accent/50 light:focus:border-accent-light/50 focus:bg-ash/90 light:focus:bg-white clip-angled'

interface LoginValues {
  email: string
  password: string
}

function defaultPathForRole(role?: string) {
  if (role === 'scanner') return '/admin/scan'
  if (role === 'admin') return '/admin'
  if (role === 'coach') return '/dashboard/coach'
  return '/dashboard'
}

export default function RegisterLoginPanel({
  defaultEmail = '',
  redirectTo: redirectOverride,
}: {
  defaultEmail?: string
  /** When set, wins over `?redirect=` (e.g. membership funnel stays on `/join`). */
  redirectTo?: string
}) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({
    defaultValues: { email: defaultEmail, password: '' },
  })
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const redirectParam = redirectOverride ?? searchParams.get('redirect')

  const getRedirectPath = (role?: string) => {
    const fallback = defaultPathForRole(role)
    const target = safeRedirect(redirectParam, fallback)
    if (role === 'scanner' && !target.startsWith('/admin/scan')) return '/admin/scan'
    return target
  }

  const { handleCredential, handleGoogleError, googleLoading, googleError } = useGoogleSignIn({
    redirectFor: getRedirectPath,
    completeSearch: redirectParam ? `?redirect=${encodeURIComponent(safeRedirect(redirectParam, '/dashboard'))}` : '',
    onLinkRequired: (email) => {
      if (email) setValue('email', email)
    },
  })
  const shownError = errorMessage || googleError

  const onSubmit = async (data: LoginValues) => {
    try {
      setLoading(true)
      setErrorMessage('')
      const response = await loginUser(data)
      login(response.token, response.user, response.refreshToken)
      const linked = response.linked_purchases ?? 0
      navigate(getRedirectPath(response.user.role), linked > 0 ? { state: { linked } } : undefined)
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {shownError && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 border-l-4 border-l-red-500 px-4 py-3.5 text-sm text-red-600 dark:text-red-400" role="alert">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <span>{shownError}</span>
        </div>
      )}

      {isGoogleEnabled && (
        <>
          <div className={googleLoading ? 'opacity-60 pointer-events-none' : undefined} aria-busy={googleLoading}>
            <GoogleButton text="signin_with" onCredential={handleCredential} onError={handleGoogleError} />
          </div>
          <div className="flex items-center gap-3.5">
            <div className="flex-1 h-px bg-white/10 light:bg-black/10" />
            <span className="font-barlow-condensed text-xs tracking-widest uppercase text-fog light:text-fog-light">or with email</span>
            <div className="flex-1 h-px bg-white/10 light:bg-black/10" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <div>
          <label className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk/60 light:text-chalk-light/60 mb-2 block" htmlFor="reg-login-email">
            Email
          </label>
          <input
            id="reg-login-email"
            type="email"
            className={inputClass}
            placeholder="you@example.com"
            autoComplete="email"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold tracking-tight flex items-center gap-1" role="alert">
              <AlertCircle size={12} /> {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk/60 light:text-chalk-light/60 mb-2 block" htmlFor="reg-login-password">
            Password
          </label>
          <div className="relative">
            <input
              id="reg-login-password"
              type={showPassword ? 'text' : 'password'}
              className={`${inputClass} pr-12`}
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </span>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold tracking-tight flex items-center gap-1" role="alert">
              <AlertCircle size={12} /> {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex justify-end -mt-2">
          <Link
            to="/forgot-password"
            className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light transition-colors duration-200 hover:text-accent light:hover:text-accent-light no-underline"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-14 bg-cta border-0 text-cta-ink font-barlow-condensed font-black text-lg tracking-widest uppercase px-8 cursor-pointer clip-angled transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cta/90"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
