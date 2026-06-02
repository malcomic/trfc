import { useForm } from 'react-hook-form'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { loginUser } from '../api/auth'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  const getRedirectPath = () => {
    const redirect = searchParams.get('redirect')
    if (!redirect) return '/'
    try {
      const decoded = decodeURIComponent(redirect)
      if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded
    } catch {
      /* ignore malformed redirect */
    }
    return '/'
  }

  const onSubmit = async (data: any) => {
    try {
      setLoading(true)
      setErrorMessage('')
      const response = await loginUser(data)
      login(response.token, response.user, response.refreshToken)
      navigate(getRedirectPath())
    } catch (error: any) {
      console.error('Login failed:', error)
      setErrorMessage(error.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-night flex font-barlow relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-lines pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-fire/15 rounded-full blur-3xl pointer-events-none" style={{ transform: 'translate(100px, -150px)' }} />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-ember/10 rounded-full blur-3xl pointer-events-none" style={{ transform: 'translate(-60px, 80px)' }} />

      {/* ── Left branding panel ── */}
      <div className="flex-1 hidden md:flex flex-col justify-between p-16 relative z-10 border-r border-white/5">
        <Link to="/" className="text-decoration-none">
          <div className="font-bebas text-7xl leading-tight text-chalk letter-spacing-tighter">
            TH<em className="not-italic text-transparent" style={{ WebkitTextStroke: '2px #FF4500' }}>I</em>KA<br />ROAD<br /><em className="not-italic text-transparent" style={{ WebkitTextStroke: '2px #FF4500' }}>FC</em>
          </div>
          <p className="font-barlow-condensed font-medium text-sm letter-spacing-widest text-transform-uppercase text-fog mt-5">Nairobi · Est. 2019</p>
        </Link>

        <div className="flex gap-10">
          {[
            { val: '500+', label: 'Members' },
            { val: '50+',  label: 'Events' },
            { val: '5 Yrs', label: 'Running' },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-bebas text-5xl text-fire leading-none">{s.val}</div>
              <div className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <p className="italic text-sm text-chalk/35 leading-loose border-l-2 border-fire pl-4.5 max-w-64">
          "Every kilometre is a conversation between who you were and who you're becoming."
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="w-full md:max-w-96 flex flex-col justify-center p-12 md:p-16 relative z-10">
        {/* Mobile-only logo */}
        <Link to="/" className="font-bebas text-3xl text-chalk letter-spacing-widest mb-10 block text-decoration-none md:hidden">
          TR<span className="text-fire">F</span>C
        </Link>

        <div className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire flex items-center gap-2 mb-3.5 before:w-5 before:h-0.5 before:bg-fire before:inline-block before:flex-shrink-0">
          Member Access
        </div>

        <h1 className="font-bebas text-5xl text-chalk leading-tight mb-2.5 letter-spacing-tighter">
          WELCOME<br />BACK
        </h1>
        <p className="text-sm text-fog leading-loose mb-10">
          Sign in to access events, track your progress, and connect with the community.
        </p>

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 border-l-4 border-l-red-500 px-4 py-3.5 mb-7 text-sm text-red-600 dark:text-red-400 animate-fadeUp" role="alert">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.25" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Email */}
          <div className="mb-5">
            <label className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk/45 mb-2.5 block" htmlFor="login-email">Email Address</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200"><Mail size={15} /></span>
              <input
                id="login-email"
                type="email"
                className="w-full bg-ash border border-white/10 text-chalk font-barlow text-base px-4 py-3.5 pl-12 outline-none transition-all duration-200 focus:border-fire/50 focus:bg-ash/80 clip-angled group-focus-within:text-fire"
                placeholder="you@example.com"
                autoComplete="email"
                {...register('email', { required: 'Email is required' })}
              />
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-fire to-ember scale-x-0 origin-left transition-transform duration-300" />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold letter-spacing-tighter flex items-center gap-1"><span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-500 text-white text-xs font-black">!</span>{errors.email.message as string}</p>
            )}
          </div>

          {/* Password */}
          <div className="mb-2">
            <label className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk/45 mb-2.5 block" htmlFor="login-password">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200"><Lock size={15} /></span>
              <input
                id="login-password"
                type="password"
                className="w-full bg-ash border border-white/10 text-chalk font-barlow text-base px-4 py-3.5 pl-12 outline-none transition-all duration-200 focus:border-fire/50 focus:bg-ash/80 clip-angled"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password', { required: 'Password is required' })}
              />
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-fire to-ember scale-x-0 origin-left transition-transform duration-300" />
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold letter-spacing-tighter flex items-center gap-1"><span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-500 text-white text-xs font-black">!</span>{errors.password.message as string}</p>
            )}
          </div>

          {/* Forgot password */}
          <div className="flex justify-end mb-2">
            <Link to="/contact" className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog text-decoration-none transition-colors duration-200 hover:text-fire">Forgot password?</Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-7 bg-fire border-0 text-white font-barlow-condensed font-black text-base letter-spacing-widest text-transform-uppercase px-8 py-4 cursor-pointer clip-angled transition-all duration-200 flex items-center justify-center gap-2.5 relative overflow-hidden disabled:opacity-55 disabled:cursor-not-allowed disabled:transform-none hover:bg-ember hover:scale-105 ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>Signing in...</>
            ) : (
              <>Sign In <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div className="flex items-center gap-3.5 my-7">
          <div className="flex-1 h-px bg-white/10" />
          <span className="font-barlow-condensed text-xs letter-spacing-widest text-transform-uppercase text-fog">New to TRFC?</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <p className="text-center text-sm text-fog">
          <Link to="/register" className="font-barlow-condensed font-black text-base letter-spacing-widest text-transform-uppercase text-fire text-decoration-none border-b border-fire/30 pb-0.25 transition-all duration-200 hover:text-ember hover:border-ember">
            Create a free account →
          </Link>
        </p>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp {
          animation: fadeUp 0.3s ease;
        }
        .bg-gradient-lines {
          background-image:
            linear-gradient(rgba(255,69,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,69,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
        }
      `}</style>
    </div>
  )
}
