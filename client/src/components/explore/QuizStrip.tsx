import { Link } from 'react-router-dom'
import { EXPLORE_COPY } from '../../content/explore'

export default function QuizStrip() {
  const copy = EXPLORE_COPY.quizStrip
  return (
    <div className="bg-cta text-cta-ink px-4 md:px-6 py-3.5">
      <div className="max-w-[1120px] mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center font-barlow">
        <strong className="text-[17px] md:text-lg">{copy.text}</strong>
        <Link
          to="/find-my-program"
          className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg bg-black text-white font-semibold no-underline hover:bg-black/85 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-cta"
        >
          {copy.button}
        </Link>
      </div>
    </div>
  )
}
