import { Link } from 'react-router-dom'
import { DISCLAIMER } from '../../content/programs'

export default function Disclaimer() {
  return (
    <section className="px-4 md:px-6 py-10 bg-ash light:bg-ash-light border-t border-white/5 light:border-black/8">
      <div className="max-w-[760px] mx-auto flex flex-col gap-3">
        <p className="m-0 text-[15px] text-fog light:text-fog-light">{DISCLAIMER}</p>
        <div className="flex flex-wrap gap-6 text-[15px]">
          <Link to="/privacy" className="text-chalk light:text-chalk-light underline min-h-[44px] inline-flex items-center">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-chalk light:text-chalk-light underline min-h-[44px] inline-flex items-center">
            Terms
          </Link>
        </div>
      </div>
    </section>
  )
}
