import { Mail, Phone, MapPin, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Contact() {
  const contacts = [
    { icon: Mail, label: 'Email', value: 'info@trfc.ke', href: 'mailto:info@trfc.ke' },
    { icon: Phone, label: 'Phone', value: '+254 712 345 678', href: 'tel:+254712345678' },
    { icon: MapPin, label: 'Location', value: 'Thika Road, Nairobi, Kenya', href: 'https://maps.google.com/?q=Thika+Road+Nairobi' },
  ]

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow">
      <section className="bg-ink border-b border-white/5 px-[6%] pt-14 pb-11">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-bebas text-5xl">GET IN <span className="text-fire">TOUCH</span></h1>
          <p className="text-fog mt-2">Questions about events, membership, or partnerships? We&apos;d love to hear from you.</p>
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
              className="bg-ash border border-white/5 p-6 flex items-center gap-5 no-underline text-chalk hover:border-fire/30 transition group"
            >
              <div className="w-12 h-12 bg-fire/10 border border-fire/20 flex items-center justify-center text-fire flex-shrink-0">
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog">{label}</p>
                <p className="font-semibold mt-1">{value}</p>
              </div>
              <ArrowRight size={16} className="text-fire opacity-0 group-hover:opacity-100 transition" />
            </a>
          ))}
        </div>

        <div className="bg-ash border border-white/5 p-8">
          <h2 className="font-barlow-condensed font-bold text-fire letter-spacing-widest text-transform-uppercase mb-4">Send a Message</h2>
          <p className="text-fog text-sm mb-6">Prefer email? Tap below to open your mail client with our address pre-filled.</p>
          <a
            href="mailto:info@trfc.ke?subject=TRFC%20Enquiry"
            className="inline-flex bg-fire text-white px-8 py-3 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase no-underline hover:bg-ember"
          >
            Email TRFC
          </a>
          <p className="text-xs text-fog mt-6">
            New to TRFC? <Link to="/register" className="text-fire no-underline hover:underline">Join the community</Link> or browse <Link to="/events" className="text-fire no-underline hover:underline">upcoming events</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
