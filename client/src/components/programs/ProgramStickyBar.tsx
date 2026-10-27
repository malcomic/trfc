import { Link } from 'react-router-dom'
import type { Program } from '../../content/programs'
import CtaButton from './CtaButton'

export default function ProgramStickyBar({ program, onJoin }: { program: Program; onJoin: () => void }) {
  return (
    <div className="sticky top-[66px] z-40 bg-ink/95 light:bg-ink-light/95 backdrop-blur border-b border-white/10 light:border-black/10 px-4 md:px-6 py-2.5">
      <div className="max-w-[1120px] mx-auto flex items-center justify-between gap-3">
        <div className="min-w-0 truncate font-barlow-condensed font-bold text-lg tracking-wide uppercase text-chalk light:text-chalk-light">
          {program.name}
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <Link
            to="/programs"
            className="hidden sm:inline-flex items-center min-h-[44px] font-semibold text-chalk light:text-chalk-light underline"
          >
            All programs
          </Link>
          <CtaButton onClick={onJoin} size="sm">
            {program.barCta}
          </CtaButton>
        </div>
      </div>
    </div>
  )
}
