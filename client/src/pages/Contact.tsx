import { Mail, Phone, MapPin, ArrowRight, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { pageRoot, cardSurface } from '../utils/themeClasses'
import { siteContact, siteSocial } from '../config/site'

export default function Contact() {
  const contacts = [
    { icon: Mail, label: 'Email', value: siteContact.email, href: `mailto:${siteContact.email}` },
    { icon: Phone, label: 'Phone', value: siteContact.phone, href: `tel:${siteContact.phoneTel}` },
    { icon: MessageCircle, label: 'WhatsApp', value: 'Chat with us', href: siteContact.whatsappUrl },
    { icon: MapPin, label: 'Location', value: siteContact.location, href: siteContact.mapsUrl },
  ]

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light">GET IN <span className="text-fire">TOUCH</span></h1>
          <p className="text-fog light:text-fog-light mt-2">Questions about events, membership, or partnerships? We&apos;d love to hear from you.</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-[6%] py-10 pb-20">
        <div className="space-y-4 mb-12">
          {contacts.map(({ icon: Icon, label, value, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className={`${cardSurface} p-6 flex items-center gap-5 no-underline text-chalk light:text-chalk-light hover:border-fire/30 transition group`}
            >
              <div className="w-12 h-12 bg-fire/10 border border-fire/20 flex items-center justify-center text-fire flex-shrink-0">
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light">{label}</p>
                <p className="font-semibold mt-1">{value}</p>
              </div>
              <ArrowRight size={16} className="text-fire opacity-0 group-hover:opacity-100 transition" />
            </a>
          ))}
        </div>

        {siteSocial.length > 0 && (
          <div className={`${cardSurface} p-8 mb-12`}>
            <h2 className="font-barlow-condensed font-bold text-fire letter-spacing-widest text-transform-uppercase mb-4">Follow Us</h2>
            <div className="flex flex-wrap gap-3">
              {siteSocial.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase px-4 py-2 border border-white/10 light:border-black/10 text-chalk light:text-chalk-light no-underline hover:border-fire hover:text-fire transition"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className={`${cardSurface} p-8`}>
          <h2 className="font-barlow-condensed font-bold text-fire letter-spacing-widest text-transform-uppercase mb-4">Send a Message</h2>
          <p className="text-fog light:text-fog-light text-sm mb-6">Prefer email? Tap below to open your mail client with our address pre-filled.</p>
          <a
            href={`mailto:${siteContact.email}?subject=TRFC%20Enquiry`}
            className="inline-flex bg-fire text-white px-8 py-3 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase no-underline hover:bg-ember"
          >
            Email TRFC
          </a>
          <p className="text-xs text-fog light:text-fog-light mt-6">
            New to TRFC? <Link to="/register" className="text-fire no-underline hover:underline">Join the community</Link> or browse{' '}
            <Link to="/partnerships" className="text-fire no-underline hover:underline">partnership options</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
