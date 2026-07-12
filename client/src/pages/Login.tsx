import { useForm } from 'react-hook-form'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { loginUser } from '../api/auth'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { Logo } from '../components/Logo'

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
    <div className="min-h-screen bg-night light:bg-night-light flex font-barlow relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-lines pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/15 light:bg-accent-light/15 rounded-full blur-3xl pointer-events-none" style={{ transform: 'translate(100px, -150px)' }} />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/10 light:bg-accent-light/10 rounded-full blur-3xl pointer-events-none" style={{ transform: 'translate(-60px, 80px)' }} />

      {/* ── Left branding panel ── */}
      <div className="flex-1 hidden md:flex flex-col justify-between p-16 relative z-10 border-r border-white/5 light:border-black/8 light:border-black/8">
        <Link to="/" className="no-underline">
          <Logo size="xl" />
          <p className="font-barlow-condensed font-medium text-sm tracking-widest uppercase text-fog mt-5">Nairobi · Est. July 2025</p>
        </Link>

        <div className="flex gap-10">
          {[
            { val: '20,000+', label: 'Members' },
            { val: '16+',  label: 'Events' },
            { val: '300K+', label: 'Monthly Reach' },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-bebas text-5xl text-accent light:text-accent-light leading-none">{s.val}</div>
              <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <p className="italic text-sm text-chalk/35 light:text-chalk-light/50 leading-loose border-l-2 border-accent light:border-accent-light pl-4.5 max-w-64">
          "Every kilometre is a conversation between who you were and who you're becoming."
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="w-full md:max-w-96 flex flex-col justify-center p-12 md:p-16 relative z-10">
        <Logo size="md" linkToHome className="mb-10 md:hidden" />

        <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-3.5 before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light before:inline-block before:flex-shrink-0">
          Member Access
        </div>

        <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light leading-tight mb-2.5 tracking-tighter">
          WELCOME<br />BACK
        </h1>
        <p className="text-sm text-fog light:text-fog-light leading-loose mb-10">
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
            <label className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk/45 light:text-chalk-light/50 mb-2.5 block" htmlFor="login-email">Email Address</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200"><Mail size={15} /></span>
              <input
                id="login-email"
                type="email"
                className="w-full bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light placeholder:text-fog/70 light:placeholder:text-fog-light/70 font-barlow text-base px-4 py-3.5 pl-12 outline-none transition-all duration-200 focus:border-accent/50 light:focus:border-accent-light/50 focus:bg-ash/80 clip-angled group-focus-within:text-accent light:group-focus-within:text-accent-light"
                placeholder="you@example.com"
                autoComplete="email"
                {...register('email', { required: 'Email is required' })}
              />
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent light:from-accent-light to-accent light:to-accent-light scale-x-0 origin-left transition-transform duration-300" />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold tracking-tighter flex items-center gap-1"><span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-500 text-white text-xs font-black">!</span>{errors.email.message as string}</p>
            )}
          </div>

          {/* Password */}
          <div className="mb-2">
            <label className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk/45 light:text-chalk-light/50 mb-2.5 block" htmlFor="login-password">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200"><Lock size={15} /></span>
              <input
                id="login-password"
                type="password"
                className="w-full bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light placeholder:text-fog/70 light:placeholder:text-fog-light/70 font-barlow text-base px-4 py-3.5 pl-12 outline-none transition-all duration-200 focus:border-accent/50 light:focus:border-accent-light/50 focus:bg-ash/80 clip-angled"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password', { required: 'Password is required' })}
              />
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent light:from-accent-light to-accent light:to-accent-light scale-x-0 origin-left transition-transform duration-300" />
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold tracking-tighter flex items-center gap-1"><span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-500 text-white text-xs font-black">!</span>{errors.password.message as string}</p>
            )}
          </div>

          {/* Forgot password */}
          <div className="flex justify-end mb-2">
            <Link to="/contact" className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog no-underline transition-colors duration-200 hover:text-accent light:hover:text-accent-light">Forgot password?</Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-7 bg-accent light:bg-accent-light border-0 text-black light:text-white font-barlow-condensed font-black text-base tracking-widest uppercase px-8 py-4 cursor-pointer clip-angled transition-all duration-200 flex items-center justify-center gap-2.5 relative overflow-hidden disabled:opacity-55 disabled:cursor-not-allowed disabled:transform-none hover:bg-accent/90 light:hover:bg-accent-light/90 hover:scale-105 ${loading ? 'loading' : ''}`}
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
          <span className="font-barlow-condensed text-xs tracking-widest uppercase text-fog light:text-fog-light">New to TRFC?</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <p className="text-center text-sm text-fog">
          <Link to="/register" className="font-barlow-condensed font-black text-base tracking-widest uppercase text-accent light:text-accent-light no-underline border-b border-accent/30 light:border-accent-light/30 pb-0.25 transition-all duration-200 hover:text-accent light:hover:text-accent-light hover:border-accent light:hover:border-accent-light">
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
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
        }
        html:not(.dark) .bg-gradient-lines {
          background-image:
            linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
        }
      `}</style>
    </div>
  )
}
