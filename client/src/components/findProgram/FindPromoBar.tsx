import { FIND_COPY } from '../../content/quiz'

export default function FindPromoBar() {
  return (
    <a
      href="#offer"
      className="block bg-cta text-cta-ink text-center px-6 py-2.5 font-barlow font-semibold text-[17px] no-underline"
    >
      {FIND_COPY.promo.line}
    </a>
  )
}
