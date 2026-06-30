import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../api/auth'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Phone, Lock, ArrowRight, AlertCircle, Check } from 'lucide-react'
import { Logo } from '../components/Logo'

function getPasswordStrength(pw: string): { score: number; label: string; cls: string } {
  if (!pw) return { score: 0, label: '', cls: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score: 1, label: 'Weak', cls: 'weak' }
  if (score <= 2) return { score: 2, label: 'Fair', cls: 'fair' }
  return { score: 3, label: 'Strong', cls: 'strong' }
}

const BENEFITS = [
  { icon: '🏃', title: 'Weekly Group Runs', desc: 'Join sunrise sessions and evening track workouts across Nairobi.' },
  { icon: '🏅', title: 'Priority Event Access', desc: 'Early registration and member-only race slots.' },
  { icon: '👕', title: 'Member Merch Discounts', desc: '15% off all TRFC official gear in the shop.' },
  { icon: '📊', title: 'Training & Coaching', desc: 'Access personalised plans from certified coaches.' },
]

export default function Register() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [agreed, setAgreed] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const passwordValue = watch('password', '')
  const strength = getPasswordStrength(passwordValue)

  const onSubmit = async (data: any) => {
    try {
      setLoading(true)
      setErrorMessage('')
      const response = await registerUser(data)
      login(response.token, response.user, response.refreshToken)
      navigate('/')
    } catch (error: any) {
      console.error('Registration failed:', error)
      setErrorMessage(error.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-night light:bg-night-light flex font-barlow relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-gradient-grid pointer-events-none" />

      {/* Glow orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/10 light:bg-accent-light/10 rounded-full blur-3xl pointer-events-none" style={{ transform: 'translate(-80px, -120px)' }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/8 light:bg-accent-light/8 rounded-full blur-3xl pointer-events-none" style={{ transform: 'translate(0, 60px)' }} />

      {/* ── Left — form ── */}
      <div className="w-full md:max-w-96 flex flex-col justify-center p-12 md:p-14 relative z-10">
        <Logo size="md" linkToHome className="mb-9 md:hidden" />

        <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-3.5 before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light before:inline-block before:flex-shrink-0">
          Create Account
        </div>
        <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light leading-tight mb-2.5 tracking-tighter">
          JOIN<br /><span className="text-transparent [-webkit-text-stroke:2px_#fff] light:[-webkit-text-stroke:2px_#000]">TRFC</span>
        </h1>
        <p className="text-sm text-fog light:text-fog-light leading-loose mb-9">
          Become part of Nairobi's most energetic running community — free to join, for life.
        </p>

        {/* Perks */}
        <div className="flex gap-2.5 flex-wrap mb-8">
          {['Free to Join', 'Nairobi Based', '500+ Members', 'Est. 2019'].map((p) => (
            <span key={p} className="flex items-center gap-1.5 font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog bg-accent/10 light:bg-accent-light/10 border border-accent/15 light:border-accent-light/15 px-2.5 py-1.25 clip-angled-sm">
              <Check size={10} className="text-accent light:text-accent-light flex-shrink-0" /> {p}
            </span>
          ))}
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 border-l-4 border-l-red-500 px-4 py-3.5 mb-7 text-sm text-red-600 dark:text-red-400 animate-regFadeUp" role="alert">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.25" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Name + Phone row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4.5">
            <div>
              <label className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk/40 light:text-chalk-light/50 mb-2.25 block" htmlFor="reg-name">Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200"><User size={14} /></span>
                <input
                  id="reg-name"
                  type="text"
                  className="w-full bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light placeholder:text-fog/70 light:placeholder:text-fog-light/70 font-barlow text-base px-4 py-3 pl-11 outline-none transition-all duration-200 focus:border-accent/50 light:focus:border-accent-light/50 focus:bg-ash/90 light:focus:bg-white clip-angled group-focus-within:bg-ash/90 group-focus-within:text-accent light:group-focus-within:text-accent-light"
                  placeholder="Jane Mwangi"
                  autoComplete="name"
                  {...register('name', { required: 'Name is required' })}
                />
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent light:from-accent-light to-accent light:to-accent-light scale-x-0 origin-left transition-transform duration-300" />
              </div>
              {errors.name && (
                <p className="text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold tracking-tighter flex items-center gap-1"><span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-red-500 text-white text-xs font-black">!</span>{errors.name.message as string}</p>
              )}
            </div>

            <div>
              <label className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk/40 light:text-chalk-light/50 mb-2.25 block" htmlFor="reg-phone">Phone</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200"><Phone size={14} /></span>
                <input
                  id="reg-phone"
                  type="tel"
                  className="w-full bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light placeholder:text-fog/70 light:placeholder:text-fog-light/70 font-barlow text-base px-4 py-3 pl-11 outline-none transition-all duration-200 focus:border-accent/50 light:focus:border-accent-light/50 focus:bg-ash/90 light:focus:bg-white clip-angled"
                  placeholder="0712 345 678"
                  autoComplete="tel"
                  {...register('phone', { required: 'Phone is required' })}
                />
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent light:from-accent-light to-accent light:to-accent-light scale-x-0 origin-left transition-transform duration-300" />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold tracking-tighter flex items-center gap-1"><span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-red-500 text-white text-xs font-black">!</span>{errors.phone.message as string}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="mb-4.5">
            <label className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk/40 light:text-chalk-light/50 mb-2.25 block" htmlFor="reg-email">Email Address</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200"><Mail size={14} /></span>
              <input
                id="reg-email"
                type="email"
                className="w-full bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light placeholder:text-fog/70 light:placeholder:text-fog-light/70 font-barlow text-base px-4 py-3 pl-11 outline-none transition-all duration-200 focus:border-accent/50 light:focus:border-accent-light/50 focus:bg-ash/90 light:focus:bg-white clip-angled"
                placeholder="you@example.com"
                autoComplete="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                })}
              />
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent light:from-accent-light to-accent light:to-accent-light scale-x-0 origin-left transition-transform duration-300" />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold tracking-tighter flex items-center gap-1"><span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-red-500 text-white text-xs font-black">!</span>{errors.email.message as string}</p>
            )}
          </div>

          {/* Password */}
          <div className="mb-4.5">
            <label className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk/40 light:text-chalk-light/50 mb-2.25 block" htmlFor="reg-password">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200"><Lock size={14} /></span>
              <input
                id="reg-password"
                type="password"
                className="w-full bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light placeholder:text-fog/70 light:placeholder:text-fog-light/70 font-barlow text-base px-4 py-3 pl-11 outline-none transition-all duration-200 focus:border-accent/50 light:focus:border-accent-light/50 focus:bg-ash/90 light:focus:bg-white clip-angled"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'At least 8 characters' },
                })}
              />
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent light:from-accent-light to-accent light:to-accent-light scale-x-0 origin-left transition-transform duration-300" />
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold tracking-tighter flex items-center gap-1"><span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-red-500 text-white text-xs font-black">!</span>{errors.password.message as string}</p>
            )}

            {/* Strength meter */}
            {passwordValue && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 h-0.75 rounded-full transition-all duration-300 ${
                        strength.score >= i
                          ? strength.cls === 'weak' ? 'bg-red-500' : strength.cls === 'fair' ? 'bg-amber-500' : 'bg-green-500'
                          : 'bg-mist'
                      }`}
                    />
                  ))}
                </div>
                <span className={`font-barlow-condensed font-bold text-xs tracking-widest uppercase ${
                  strength.cls === 'weak' ? 'text-red-500' : strength.cls === 'fair' ? 'text-amber-500' : 'text-green-500'
                }`}>
                  {strength.label} password
                </span>
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="flex items-start gap-2.5 mb-6 cursor-pointer" onClick={() => setAgreed((v) => !v)}>
            <div className={`w-4.5 h-4.5 bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 flex-shrink-0 mt-0.25 flex items-center justify-center transition-all duration-200 clip-angled-sm ${agreed ? 'bg-accent light:bg-accent-light border-accent light:border-accent-light' : ''}`}>
              {agreed && <Check size={11} className="text-black light:text-white" strokeWidth={3} />}
            </div>
            <p className="text-xs text-fog light:text-fog-light leading-loose">
              I agree to the <Link to="/terms" onClick={(e) => e.stopPropagation()} className="text-accent light:text-accent-light no-underline hover:underline">Terms of Service</Link> and{' '}
              <Link to="/privacy" onClick={(e) => e.stopPropagation()} className="text-accent light:text-accent-light no-underline hover:underline">Privacy Policy</Link>
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !agreed}
            className={`w-full bg-accent light:bg-accent-light border-0 text-black light:text-white font-barlow-condensed font-black text-base tracking-widest uppercase px-8 py-4 cursor-pointer clip-angled transition-all duration-200 flex items-center justify-center gap-2.5 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none hover:bg-accent/90 light:hover:bg-accent-light/90 hover:scale-105 ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Creating account…' : <><span>Create My Account</span> <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="flex items-center gap-3.5 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="font-barlow-condensed text-xs tracking-widest uppercase text-fog light:text-fog-light">Have an account?</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
        <p className="text-center">
          <Link to="/login" className="font-barlow-condensed font-black text-base tracking-widest uppercase text-accent light:text-accent-light no-underline border-b border-accent/30 light:border-accent-light/30 pb-0.25 transition-all duration-200 hover:text-accent light:hover:text-accent-light hover:border-accent light:hover:border-accent-light">Sign in instead →</Link>
        </p>
      </div>

      {/* ── Right — branding ── */}
      <div className="flex-1 hidden md:flex flex-col justify-between p-16 relative z-10">
        <div>
          <Link to="/" className="no-underline">
            <div className="font-bebas text-7xl leading-tight text-chalk light:text-chalk-light tracking-tighter">
              TH<em className="not-italic text-transparent [-webkit-text-stroke:2px_#fff] light:[-webkit-text-stroke:2px_#000]">I</em>KA<br />ROAD<br /><em className="not-italic text-transparent [-webkit-text-stroke:2px_#fff] light:[-webkit-text-stroke:2px_#000]">FC</em>
            </div>
            <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog mt-4">Nairobi · Est. 2019</p>
          </Link>
        </div>

        <div className="flex flex-col gap-0.5">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex items-center gap-3.5 py-4 border-b border-white/5 last:border-b-0">
              <div className="w-9 h-9 bg-accent/10 light:bg-accent-light/10 border border-accent/20 light:border-accent-light/20 flex items-center justify-center text-accent light:text-accent-light flex-shrink-0 clip-angled-sm" role="img" aria-label={b.title}>
                <span className="text-base">{b.icon}</span>
              </div>
              <div>
                <strong className="text-chalk block text-base">{b.title}</strong>
                {b.desc}
              </div>
            </div>
          ))}
        </div>

        <blockquote className="italic text-sm text-chalk/30 leading-loose border-l-2 border-accent light:border-accent-light pl-4">
          "Joining TRFC changed how I train. The community keeps you accountable and the energy is unmatched."
          <cite className="not-italic block mt-1.5 font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog">— Amina K., Member since 2021</cite>
        </blockquote>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes regFadeUp {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-regFadeUp {
          animation: regFadeUp 0.3s ease;
        }
        .bg-gradient-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
        }
        html:not(.dark) .bg-gradient-grid {
          background-image:
            linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px);
        }
      `}</style>
    </div>
  )
}
