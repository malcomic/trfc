import { ChevronDown } from 'lucide-react'
import type { ProgramFaq } from '../../content/programs'
import SectionHeading from './SectionHeading'

export default function FaqList({ faqs, className = '' }: { faqs: ProgramFaq[]; className?: string }) {
  return (
    <section className={`px-4 md:px-6 py-12 md:py-20 ${className}`}>
      <div className="max-w-[760px] mx-auto flex flex-col">
        <SectionHeading className="mb-6">Questions</SectionHeading>
        <div className="border-b border-white/10 light:border-black/10">
          {faqs.map((faq) => (
            <details key={faq.q} className="group border-t border-white/10 light:border-black/10">
              <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-between gap-4 min-h-[44px] py-3.5 font-barlow font-semibold text-xl text-chalk light:text-chalk-light">
                {faq.q}
                <ChevronDown size={20} className="flex-shrink-0 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="m-0 pb-5 text-fog light:text-fog-light">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
