import { ArrowRight } from 'lucide-react'

export const SIGNUP_ANCHOR = 'signup'

export function scrollToSignup() {
  document.getElementById(SIGNUP_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function SignupCta({ className = '' }: { className?: string }) {
  return (
    <a
      href={`#${SIGNUP_ANCHOR}`}
      onClick={(e) => {
        e.preventDefault()
        scrollToSignup()
      }}
      className={`inline-flex items-center justify-center gap-2.5 min-h-14 px-8 bg-accent light:bg-accent-light text-black light:text-white font-barlow-condensed font-black text-lg tracking-widest uppercase no-underline clip-angled transition-all duration-200 hover:bg-accent/90 light:hover:bg-accent-light/90 hover:scale-105 ${className}`}
    >
      Make my free account <ArrowRight size={18} />
    </a>
  )
}
