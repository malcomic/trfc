import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowRight, Check, Lock, Mail, MapPin, MessageCircle, Phone, User, Users } from 'lucide-react'
import { completeGoogleSignup, registerUser } from '../../api/auth'
import { getCaptainDirectory, getReferrer, type CaptainDirectoryEntry, type Referrer } from '../../api/captains'
import { getZones, type Zone } from '../../api/zones'
import {
  ANSWERS_PENDING_KEY,
  EMPTY_ANSWERS,
  SIGNUP_QUESTIONS_COPY,
  compactAnswers,
  type SignupAnswers,
} from '../../content/signupQuestions'
import { useAuth } from '../../context/AuthContext'
import { clearReferral, getStoredReferral } from '../../utils/referral'
import { getPasswordStrength } from '../../utils/passwordStrength'
import { safeRedirect } from '../../utils/safeRedirect'
import { PasswordToggle } from '../ui'
import { SIGNUP_ANCHOR } from './SignupCta'
import SignupQuestions from './SignupQuestions'
import CaptainCardPicker from '../captain/CaptainCardPicker'
import GoogleButton, { isGoogleEnabled } from '../auth/GoogleButton'
import { clearPendingGoogleSignup, useGoogleSignIn, type PendingGoogleSignup } from '../auth/useGoogleSignIn'

interface RegisterFormValues {
  name: string
  phone: string
  whatsapp: string
  email: string
  password: string
  confirmPassword: string
  captainId: string
}

const NO_CAPTAIN = 'none'
const PHONE_PATTERN = /^(?:\+?254|0)?[17]\d{8}$/

const inputClass =
  'w-full bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light placeholder:text-fog/70 light:placeholder:text-fog-light/70 font-barlow text-base py-3.5 pl-11 pr-4 outline-none transition-all duration-200 focus:border-accent/50 light:focus:border-accent-light/50 focus:bg-ash/90 light:focus:bg-white clip-angled disabled:opacity-60 disabled:cursor-not-allowed'

const STRENGTH_STYLES = {
  weak: { bar: 'bg-red-500', text: 'text-red-500' },
  fair: { bar: 'bg-amber-500', text: 'text-amber-500' },
  strong: { bar: 'bg-green-500', text: 'text-green-500' },
} as const

function isValidKenyanPhone(value: string): boolean {
  return PHONE_PATTERN.test(value.replace(/[\s-]/g, ''))
}

/** Guest buyers arrive with ?name=&email=&phone= from their confirmation page or email. */
export function readPrefill(params: URLSearchParams): Partial<Pick<RegisterFormValues, 'name' | 'email' | 'phone'>> {
  const prefill: Partial<Pick<RegisterFormValues, 'name' | 'email' | 'phone'>> = {}
  for (const key of ['name', 'email', 'phone'] as const) {
    const value = params.get(key)?.trim().slice(0, 150)
    if (value) prefill[key] = value
  }
  return prefill
}

function hasPrefill(params: URLSearchParams): boolean {
  return Object.keys(readPrefill(params)).length > 0
}

function Field({
  id,
  label,
  icon,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  icon: ReactNode
  error?: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <label className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk/60 light:text-chalk-light/60 mb-2 block" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fog light:text-fog-light pointer-events-none z-10">{icon}</span>
        {children}
      </div>
      {error ? (
        <p className="text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold tracking-tight flex items-center gap-1" role="alert">
          <AlertCircle size={12} /> {error}
        </p>
      ) : (
        hint
      )}
    </div>
  )
}

function CheckRow({
  id,
  checked,
  onChange,
  children,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer select-none">
      <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className={`flex-none w-5 h-5 mt-0.5 flex items-center justify-center border clip-angled-sm transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-accent light:peer-focus-visible:ring-accent-light ${
          checked
            ? 'bg-accent light:bg-accent-light border-accent light:border-accent-light'
            : 'bg-ash light:bg-smoke-light border-white/20 light:border-black/20'
        }`}
      >
        {checked && <Check size={13} strokeWidth={3} className="text-black light:text-white" />}
      </span>
      <span className="text-sm text-fog light:text-fog-light leading-relaxed">{children}</span>
    </label>
  )
}

interface RegisterFormProps {
  /** Set when finishing a Google sign-up: name, email and password come from Google instead of the form. */
  googleSignup?: PendingGoogleSignup
}

export default function RegisterForm({ googleSignup }: RegisterFormProps = {}) {
  const [searchParams] = useSearchParams()
  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({ defaultValues: { captainId: '', ...readPrefill(searchParams) } })
  const navigate = useNavigate()
  const { login } = useAuth()
  const redirectTo = safeRedirect(searchParams.get('redirect'), '/dashboard')
  const prefillEmail = searchParams.get('email')?.trim() ?? ''
  const loginParams = new URLSearchParams()
  if (searchParams.get('redirect')) loginParams.set('redirect', redirectTo)
  if (prefillEmail) loginParams.set('email', prefillEmail)
  const loginQuery = loginParams.toString()
  const loginPath = loginQuery ? `/login?${loginQuery}` : '/login'
  const isPrefilled = hasPrefill(searchParams)

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [whatsappSame, setWhatsappSame] = useState(true)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [referrer, setReferrer] = useState<Referrer | null>(null)
  const [captains, setCaptains] = useState<CaptainDirectoryEntry[] | null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [answers, setAnswers] = useState<SignupAnswers>(EMPTY_ANSWERS)

  const redirectParam = searchParams.get('redirect')
  const { handleCredential, handleGoogleError, googleLoading, googleError } = useGoogleSignIn({
    redirectFor: () => redirectTo,
    completeSearch: redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : '',
  })
  const shownError = errorMessage || googleError

  useEffect(() => {
    let cancelled = false
    const code = getStoredReferral()
    if (code) {
      getReferrer(code)
        .then((result) => {
          if (!cancelled) setReferrer(result)
        })
        .catch((error) => {
          if (error?.response?.status === 404) clearReferral()
        })
    }
    getCaptainDirectory()
      .then((list) => {
        if (!cancelled) setCaptains(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) setCaptains([])
      })
    getZones()
      .then((list) => {
        if (!cancelled) setZones(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isPrefilled) return
    document.getElementById(SIGNUP_ANCHOR)?.scrollIntoView({ block: 'start' })
  }, [isPrefilled])

  const phoneValue = watch('phone', '')
  const passwordValue = watch('password', '')
  const captainIdValue = watch('captainId', '')
  const strength = getPasswordStrength(passwordValue)
  const strengthStyle = strength.cls ? STRENGTH_STYLES[strength.cls] : null
  const toggle = <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setLoading(true)
      setErrorMessage('')
      const referralCode = referrer?.code ?? getStoredReferral() ?? undefined
      const captainId = values.captainId && values.captainId !== NO_CAPTAIN ? values.captainId : undefined
      const shared = {
        phone: values.phone.trim(),
        whatsapp: whatsappSame ? values.phone.trim() : values.whatsapp.trim(),
        referralCode,
        captainId,
        marketingOptIn,
        answers: compactAnswers(referrer ? { ...answers, zone: '' } : answers),
      }
      const response = googleSignup
        ? await completeGoogleSignup({ ...shared, signupToken: googleSignup.signupToken })
        : await registerUser({ ...shared, name: values.name.trim(), email: values.email.trim(), password: values.password })
      if (response.answersSaved === false) localStorage.setItem(ANSWERS_PENDING_KEY, '1')
      clearReferral()
      clearPendingGoogleSignup()
      login(response.token, response.user, response.refreshToken)
      const linked = response.linked_purchases ?? 0
      navigate(redirectTo, linked > 0 ? { state: { linked } } : undefined)
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const setAnswer = (field: keyof SignupAnswers, value: string) => setAnswers((prev) => ({ ...prev, [field]: value }))

  const skipQuestions = () => {
    const terms = document.getElementById('reg-terms')
    terms?.closest('label')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    terms?.focus({ preventScroll: true })
  }

  const answeredZoneId = zones.find((z) => z.slug === answers.zone)?.id
  const captainChoices = referrer
    ? (captains ?? []).filter((c) => c.region_id === referrer.region_id)
    : [...(captains ?? [])].sort((a, b) => Number(b.region_id === answeredZoneId) - Number(a.region_id === answeredZoneId))
  const showCaptainSelect = captainChoices.length > 0

  return (
    <section id={SIGNUP_ANCHOR} className="px-6 md:px-10 py-20 scroll-mt-20">
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-bebas text-4xl md:text-5xl tracking-tight text-accent light:text-accent-light m-0">Make your free account</h2>
          <p className="m-0 text-fog light:text-fog-light">{SIGNUP_QUESTIONS_COPY.subtitle}</p>
        </div>

        {shownError && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 border-l-4 border-l-red-500 px-4 py-3.5 text-sm text-red-600 dark:text-red-400" role="alert">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>
              {shownError}
              {/Sign in (instead|with)/.test(shownError) && (
                <>
                  {' '}
                  <Link to={loginPath} className="font-bold underline text-current">Sign in</Link>
                </>
              )}
            </span>
          </div>
        )}

        {googleSignup ? (
          <div className="flex items-center gap-3 bg-accent/10 light:bg-accent-light/10 border border-accent/25 light:border-accent-light/25 border-l-4 border-l-accent light:border-l-accent-light px-4 py-3 text-sm text-chalk light:text-chalk-light">
            {googleSignup.profile.picture && (
              <img src={googleSignup.profile.picture} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full flex-none" />
            )}
            <span className="flex-1 min-w-0">
              Signing up as <strong>{googleSignup.profile.name}</strong>
              <span className="block text-fog light:text-fog-light truncate">{googleSignup.profile.email}</span>
            </span>
            <Link
              to="/register"
              onClick={clearPendingGoogleSignup}
              className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light no-underline hover:underline flex-none"
            >
              Not you?
            </Link>
          </div>
        ) : (
          isGoogleEnabled && (
            <>
              <div className={googleLoading ? 'opacity-60 pointer-events-none' : undefined} aria-busy={googleLoading}>
                <GoogleButton text="signup_with" onCredential={handleCredential} onError={handleGoogleError} />
              </div>
              <div className="flex items-center gap-3.5">
                <div className="flex-1 h-px bg-white/10 light:bg-black/10" />
                <span className="font-barlow-condensed text-xs tracking-widest uppercase text-fog light:text-fog-light">or with email</span>
                <div className="flex-1 h-px bg-white/10 light:bg-black/10" />
              </div>
            </>
          )
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          {!googleSignup && (
            <Field id="reg-name" label="Your name" icon={<User size={14} />} error={errors.name?.message}>
              <input
                id="reg-name"
                type="text"
                className={inputClass}
                placeholder="Your name"
                autoComplete="name"
                {...register('name', { required: 'Please enter your name', validate: (v) => v.trim() !== '' || 'Please enter your name' })}
              />
            </Field>
          )}

          <Field id="reg-phone" label="Phone number" icon={<Phone size={14} />} error={errors.phone?.message}>
            <input
              id="reg-phone"
              type="tel"
              className={inputClass}
              placeholder="07XX XXX XXX"
              autoComplete="tel"
              {...register('phone', {
                required: 'Phone number is required',
                validate: (v) => isValidKenyanPhone(v) || 'Enter a valid phone number, e.g. 07XX XXX XXX',
              })}
            />
          </Field>

          <div className="flex flex-col gap-2.5">
            <Field id="reg-whatsapp" label="WhatsApp number" icon={<MessageCircle size={14} />} error={whatsappSame ? undefined : errors.whatsapp?.message}>
              {whatsappSame ? (
                <input
                  key="whatsapp-same"
                  id="reg-whatsapp"
                  type="tel"
                  className={inputClass}
                  placeholder="Same as your phone number"
                  value={phoneValue}
                  disabled
                  readOnly
                />
              ) : (
                <input
                  key="whatsapp-own"
                  id="reg-whatsapp"
                  type="tel"
                  className={inputClass}
                  placeholder="07XX XXX XXX"
                  autoComplete="tel"
                  {...register('whatsapp', {
                    required: 'WhatsApp number is required',
                    validate: (v) => isValidKenyanPhone(v) || 'Enter a valid WhatsApp number, e.g. 07XX XXX XXX',
                    shouldUnregister: true,
                  })}
                />
              )}
            </Field>
            <CheckRow id="reg-whatsapp-same" checked={whatsappSame} onChange={setWhatsappSame}>
              Same as my phone number
            </CheckRow>
          </div>

          {!googleSignup && (
            <>
              <Field id="reg-email" label="Email address" icon={<Mail size={14} />} error={errors.email?.message}>
                <input
                  id="reg-email"
                  type="email"
                  className={inputClass}
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                  })}
                />
              </Field>

              <Field
                id="reg-password"
                label="Password"
                icon={<Lock size={14} />}
                error={errors.password?.message}
                hint={
                  passwordValue && strengthStyle ? (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className={`flex-1 h-0.75 rounded-full transition-all duration-300 ${strength.score >= i ? strengthStyle.bar : 'bg-mist light:bg-mist-light'}`} />
                        ))}
                      </div>
                      <span className={`font-barlow-condensed font-bold text-xs tracking-widest uppercase ${strengthStyle.text}`}>{strength.label} password</span>
                    </div>
                  ) : undefined
                }
              >
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputClass} pr-11`}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters' },
                    deps: ['confirmPassword'],
                  })}
                />
                {toggle}
              </Field>

              <Field id="reg-confirm-password" label="Confirm password" icon={<Lock size={14} />} error={errors.confirmPassword?.message}>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputClass} pr-11`}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (v) => v === getValues('password') || 'Passwords do not match',
                  })}
                />
                {toggle}
              </Field>
            </>
          )}

          <SignupQuestions values={answers} onChange={setAnswer} zones={zones} hideZone={!!referrer} onSkip={skipQuestions} />

          {referrer && (
            <div>
              <span className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk/60 light:text-chalk-light/60 mb-2 block">Your zone</span>
              <div className="flex items-center gap-2.5 bg-accent/10 light:bg-accent-light/10 border border-accent/25 light:border-accent-light/25 border-l-4 border-l-accent light:border-l-accent-light px-4 py-3 text-sm text-chalk light:text-chalk-light">
                <MapPin size={15} className="flex-shrink-0 text-accent light:text-accent-light" />
                <span>
                  Joining the <strong>{referrer.zone}</strong> zone
                </span>
              </div>
            </div>
          )}

          {showCaptainSelect && (
            <div>
              <span className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk/60 light:text-chalk-light/60 mb-2 flex items-center gap-2">
                <Users size={14} aria-hidden="true" /> Your captain
              </span>
              <p className="m-0 mb-3 text-sm text-fog light:text-fog-light">
                {referrer ? `Choose your ${referrer.zone} captain.` : 'Choose your captain.'} You can change later from your
                dashboard.
              </p>
              <CaptainCardPicker
                captains={captainChoices}
                value={captainIdValue}
                onChange={(id) => setValue('captainId', id)}
                label={referrer ? `Choose your ${referrer.zone} captain` : 'Choose your captain'}
                showZone={!referrer}
                noneOption={{ value: NO_CAPTAIN, label: "I don't have one yet" }}
              />
            </div>
          )}

          <CheckRow id="reg-marketing" checked={marketingOptIn} onChange={setMarketingOptIn}>
            Yes, text me and email me about my program, TRFC events and the 2027 membership.
          </CheckRow>

          <CheckRow id="reg-terms" checked={agreed} onChange={setAgreed}>
            I agree to the{' '}
            <Link to="/terms" className="text-accent light:text-accent-light no-underline hover:underline">Terms</Link> and{' '}
            <Link to="/privacy" className="text-accent light:text-accent-light no-underline hover:underline">Privacy Notice</Link>.
          </CheckRow>

          <p className="m-0 text-sm text-fog light:text-fog-light">{SIGNUP_QUESTIONS_COPY.beforeButton}</p>

          <button
            type="submit"
            disabled={loading || !agreed}
            className="w-full min-h-14 bg-cta border-0 text-cta-ink font-barlow-condensed font-black text-lg tracking-widest uppercase px-8 cursor-pointer clip-angled transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cta/90"
          >
            {loading ? 'Creating your account…' : <><span>{SIGNUP_QUESTIONS_COPY.button}</span> <ArrowRight size={18} /></>}
          </button>
        </form>

        <p className="m-0 text-sm text-fog light:text-fog-light">
          We will not give your number or email to anyone. To stop messages, tell us or tell your captain.
        </p>
        <p className="m-0 text-sm text-fog light:text-fog-light">
          Already have an account?{' '}
          <Link to={loginPath} className="font-barlow-condensed font-black tracking-widest uppercase text-accent light:text-accent-light no-underline hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  )
}
