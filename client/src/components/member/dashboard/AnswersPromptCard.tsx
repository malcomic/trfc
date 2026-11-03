import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { ANSWERS_PENDING_KEY, SIGNUP_QUESTIONS_COPY } from '../../../content/signupQuestions'
import { MY_ANSWERS_ANCHOR } from '../MyAnswersForm'

/** Shown when saving the sign-up answers failed, so the member can answer again. */
export default function AnswersPromptCard() {
  const [visible, setVisible] = useState(() => localStorage.getItem(ANSWERS_PENDING_KEY) === '1')
  if (!visible) return null

  const dismiss = () => {
    localStorage.removeItem(ANSWERS_PENDING_KEY)
    setVisible(false)
  }

  return (
    <div className="relative border border-gold/30 border-l-4 border-l-gold bg-gold/10 p-5 pr-12">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 bg-transparent border-0 p-1 cursor-pointer text-fog light:text-fog-light hover:text-chalk light:hover:text-chalk-light"
      >
        <X size={16} />
      </button>
      <h2 className="m-0 font-bebas text-2xl tracking-tight text-gold">{SIGNUP_QUESTIONS_COPY.title}</h2>
      <p className="mt-1 mb-3 text-sm text-fog light:text-fog-light">
        We could not save your answers when you signed up. They are optional and take one minute.
      </p>
      <Link
        to={`/dashboard/profile#${MY_ANSWERS_ANCHOR}`}
        className="font-barlow-condensed font-bold text-sm tracking-widest uppercase text-gold no-underline hover:underline"
      >
        Answer now
      </Link>
    </div>
  )
}
