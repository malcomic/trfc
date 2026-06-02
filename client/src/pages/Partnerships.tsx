import { useState } from 'react'
import { CheckCircle, AlertCircle, Handshake, Building2, Megaphone, Crown } from 'lucide-react'
import { submitPartnership } from '../api/partnerships'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'

const TIERS = [
  {
    id: 'community',
    icon: Building2,
    name: 'Community Partner',
    price: 'KES 50,000',
    benefits: ['Logo on event banners', 'Social media shout-out', '2 complimentary event entries'],
  },
  {
    id: 'title',
    icon: Megaphone,
    name: 'Title Sponsor',
    price: 'KES 150,000',
    benefits: ['Title naming on one flagship event', 'Logo on TRFC merch', 'Booth at 3 events', 'Newsletter feature'],
  },
  {
    id: 'premier',
    icon: Crown,
    name: 'Premier Partner',
    price: 'KES 300,000',
    benefits: ['Season-long brand presence', 'Exclusive category naming rights', 'Coach-led brand activation', 'Priority vendor onboarding'],
  },
]

const POLICIES = [
  'All sponsorships are subject to TRFC brand guidelines and approval.',
  'Logo usage is limited to agreed event materials and digital channels for the contract period.',
  'Payment is due within 14 days of agreement; events may be rescheduled with 30 days notice.',
  'Vendors must comply with Kenya event and safety regulations at all TRFC activations.',
]

export default function Partnerships() {
  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    tier: 'community',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name.trim() || !form.contact_person.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please fill in all required fields')
      return
    }
    try {
      setSubmitting(true)
      setError('')
      await submitPartnership(form)
      setSubmitted(true)
      setForm({ company_name: '', contact_person: '', email: '', phone: '', tier: 'community', message: '' })
    } catch {
      setError('Failed to submit inquiry. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11 relative overflow-hidden">
        <div className="absolute right-[-1%] bottom-[-16px] font-bebas text-clamp-2xl text-fire/5 leading-none pointer-events-none select-none">PARTNER</div>
        <div className="max-w-5xl mx-auto relative z-1">
          <div className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire flex items-center gap-2 mb-3 before:w-5 before:h-0.5 before:bg-fire">
            <Handshake size={14} /> Sponsorships
          </div>
          <h1 className="font-bebas text-5xl leading-tight text-chalk light:text-chalk-light">PARTNER WITH<br /><span className="text-fire">TRFC</span></h1>
          <p className="text-fog light:text-fog-light mt-4 max-w-xl">
            Align your brand with Nairobi&apos;s most energetic running community. Reach 500+ active members at events, online, and on the road.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-[6%] py-10 pb-20 space-y-16">
        <section>
          <h2 className="font-bebas text-4xl text-chalk light:text-chalk-light mb-6">SPONSORSHIP TIERS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TIERS.map(({ id, icon: Icon, name, price, benefits }) => (
              <div key={id} className={`${cardSurface} p-6 flex flex-col ${form.tier === id ? 'border-fire/40' : ''}`}>
                <div className="w-12 h-12 bg-fire/10 border border-fire/20 flex items-center justify-center text-fire mb-4">
                  <Icon size={22} />
                </div>
                <h3 className="font-barlow-condensed font-bold text-xl mb-1">{name}</h3>
                <p className="font-bebas text-2xl text-fire mb-4">{price}</p>
                <ul className="text-sm text-fog light:text-fog-light space-y-2 flex-1">
                  {benefits.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-bebas text-4xl text-chalk light:text-chalk-light mb-4">POLICIES</h2>
          <div className={`${cardSurface} p-6`}>
            <ul className="text-sm text-fog light:text-fog-light space-y-3">
              {POLICIES.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="font-bebas text-4xl text-chalk light:text-chalk-light mb-6">VENDOR ONBOARDING</h2>
          <div className={`${cardSurface} p-8 max-w-2xl`}>
            {submitted ? (
              <div className="flex gap-3 text-green-400 text-sm">
                <CheckCircle size={20} className="flex-shrink-0" />
                <p>Thank you! Your partnership inquiry has been received. Our team will contact you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-fog light:text-fog-light block mb-1.5">Company Name *</label>
                    <input name="company_name" value={form.company_name} onChange={handleChange} className={`w-full px-3 py-2 text-sm ${inputField}`} placeholder="Your company" />
                  </div>
                  <div>
                    <label className="text-xs text-fog light:text-fog-light block mb-1.5">Contact Person *</label>
                    <input name="contact_person" value={form.contact_person} onChange={handleChange} className={`w-full px-3 py-2 text-sm ${inputField}`} placeholder="Full name" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-fog light:text-fog-light block mb-1.5">Email *</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} className={`w-full px-3 py-2 text-sm ${inputField}`} placeholder="you@company.com" />
                  </div>
                  <div>
                    <label className="text-xs text-fog light:text-fog-light block mb-1.5">Phone *</label>
                    <input name="phone" type="tel" value={form.phone} onChange={handleChange} className={`w-full px-3 py-2 text-sm ${inputField}`} placeholder="0712 345 678" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-fog light:text-fog-light block mb-1.5">Sponsorship Tier *</label>
                  <select name="tier" value={form.tier} onChange={handleChange} className={`w-full px-3 py-2 text-sm ${inputField}`}>
                    {TIERS.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} — {t.price}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-fog light:text-fog-light block mb-1.5">Message</label>
                  <textarea name="message" value={form.message} onChange={handleChange} rows={4} className={`w-full px-3 py-2 text-sm resize-none ${inputField}`} placeholder="Tell us about your brand and goals…" />
                </div>
                {error && (
                  <div className="flex gap-2 text-red-400 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0" /> {error}
                  </div>
                )}
                <button type="submit" disabled={submitting} className="w-full bg-fire text-white py-3 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase hover:bg-ember disabled:opacity-50">
                  {submitting ? 'Submitting…' : 'Submit Inquiry'}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
