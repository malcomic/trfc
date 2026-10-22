import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'

interface AuthLayoutProps {
  eyebrow: string
  title: ReactNode
  intro: ReactNode
  children: ReactNode
}

export default function AuthLayout({ eyebrow, title, intro, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-night light:bg-night-light flex font-barlow relative overflow-hidden">
      <div className="absolute inset-0 auth-gradient-lines pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/15 light:bg-accent-light/15 rounded-full blur-3xl pointer-events-none" style={{ transform: 'translate(100px, -150px)' }} />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/10 light:bg-accent-light/10 rounded-full blur-3xl pointer-events-none" style={{ transform: 'translate(-60px, 80px)' }} />

      <div className="flex-1 hidden md:flex flex-col justify-between p-16 relative z-10 border-r border-white/5 light:border-black/8">
        <Link to="/" className="no-underline">
          <Logo size="xl" />
          <p className="font-barlow-condensed font-medium text-sm tracking-widest uppercase text-fog light:text-fog-light mt-5">Nairobi · Est. July 2025</p>
        </Link>
        <p className="italic text-sm text-chalk/35 light:text-chalk-light/50 leading-loose border-l-2 border-accent light:border-accent-light pl-4.5 max-w-64">
          "Every kilometre is a conversation between who you were and who you're becoming."
        </p>
      </div>

      <div className="w-full md:max-w-96 flex flex-col justify-center p-12 md:p-16 relative z-10">
        <Logo size="md" linkToHome className="mb-10 md:hidden" />

        <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-3.5 before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light before:inline-block before:flex-shrink-0">
          {eyebrow}
        </div>
        <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light leading-tight mb-2.5 tracking-tighter">{title}</h1>
        <p className="text-sm text-fog light:text-fog-light leading-loose mb-10">{intro}</p>

        {children}
      </div>

      <style>{`
        @keyframes authFadeUp {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-authFadeUp { animation: authFadeUp 0.3s ease; }
        .auth-gradient-lines {
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
        }
        html:not(.dark) .auth-gradient-lines {
          background-image:
            linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
        }
      `}</style>
    </div>
  )
}

export function AuthAlert({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  const styles =
    tone === 'error'
      ? 'bg-red-500/10 border-red-500/25 border-l-red-500 text-red-600 dark:text-red-400'
      : 'bg-green-500/10 border-green-500/25 border-l-green-500 text-green-700 dark:text-green-400'
  return (
    <div className={`flex items-start gap-2.5 border border-l-4 px-4 py-3.5 mb-7 text-sm animate-authFadeUp ${styles}`} role={tone === 'error' ? 'alert' : 'status'}>
      <div>{children}</div>
    </div>
  )
}

export function BackToSignIn() {
  return (
    <p className="text-center text-sm mt-8">
      <Link to="/login" className="font-barlow-condensed font-black text-base tracking-widest uppercase text-accent light:text-accent-light no-underline border-b border-accent/30 light:border-accent-light/30 pb-0.25 transition-all duration-200 hover:border-accent light:hover:border-accent-light">
        ← Back to sign in
      </Link>
    </p>
  )
}
