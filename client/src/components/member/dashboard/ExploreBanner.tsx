import { Link } from 'react-router-dom'
import { DASHBOARD_COPY } from '../../../content/dashboard'
import CtaButton from '../../programs/CtaButton'

const copy = DASHBOARD_COPY.explore

export default function ExploreBanner() {
  return (
    <div className="rounded-2xl bg-ink light:bg-[#111111] border border-white/5 p-6 md:p-8 flex flex-wrap items-center justify-between gap-6">
      <div className="max-w-xl">
        <h2 className="font-bebas text-3xl tracking-wide text-white">{copy.heading}</h2>
        <p className="mt-2 text-[#A3A3A3]">{copy.body}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <CtaButton to="/programs" size="sm">
          {copy.button}
        </CtaButton>
        <Link to="/find-my-program" className="font-barlow font-semibold text-white underline underline-offset-4 hover:text-cta">
          {copy.quiz}
        </Link>
      </div>
    </div>
  )
}
