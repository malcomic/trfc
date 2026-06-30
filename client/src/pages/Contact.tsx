<<<<<<< HEAD
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { AlertCircle, CheckCircle, Mail, MapPin, Phone } from 'lucide-react'
import { Button, FormInput } from '../components/ui'

export default function Contact() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const onSubmit = async (data: any) => {
    try {
      setLoading(true)
      setErrorMessage('')
      
      // TODO: Replace with actual API call
      console.log('Contact form submitted:', data)
      
      setSuccess(true)
      reset()
      setTimeout(() => setSuccess(false), 5000)
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink via-ash to-night border-b border-white/5 px-[6%] py-16 md:py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-fire rounded-full blur-3xl" style={{ transform: 'translate(50%, -50%)' }} />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-ember rounded-full blur-3xl" style={{ transform: 'translate(-30%, 30%)' }} />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-4 before:block before:w-5 before:h-0.5 before:bg-fire">
            Get In Touch
          </div>
          <h1 className="font-bebas text-clamp-lg leading-tight text-chalk mb-4 letter-spacing-tighter">
            CONNECT<br />WITH US
          </h1>
          <p className="font-barlow text-lg text-fog max-w-2xl leading-relaxed">
            Have questions about TRFC events, shop products, or want to collaborate? Our community team is here to help. Reach out anytime — we'd love to hear from you.
          </p>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="max-w-5xl mx-auto px-[6%] py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Contact Info Cards */}
          {[
            {
              icon: MapPin,
              title: 'Location',
              details: ['Nairobi, Kenya', 'East Africa'],
              color: 'fire'
            },
            {
              icon: Mail,
              title: 'Email',
              details: ['info@thikafrc.com', 'support@thikafrc.com'],
              color: 'fire'
            },
            {
              icon: Phone,
              title: 'Phone',
              details: ['+254 712 345 678', 'Mon-Sat 9am-5pm'],
              color: 'fire'
            }
          ].map((contact, idx) => {
            const Icon = contact.icon
            return (
              <div key={idx} className="bg-ash border border-white/10 p-6 hover:border-fire/30 transition-all duration-300 group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-fire/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-fire/20 transition-colors duration-300">
                    <Icon size={20} className="text-fire" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk mb-2">
                      {contact.title}
                    </h3>
                    {contact.details.map((detail, i) => (
                      <p key={i} className="text-sm text-fog mb-1">{detail}</p>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h2 className="font-bebas text-4xl text-chalk mb-2 letter-spacing-tighter">Send us a Message</h2>
            <p className="text-fog mb-8">Fill out the form below and we'll get back to you as soon as possible.</p>

            {success && (
              <div className="flex items-start gap-3 bg-success-green/10 border border-success-green/30 p-4 mb-6 rounded-sm">
                <CheckCircle size={20} className="text-success-green flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-success-green">Message Sent!</p>
                  <p className="text-sm text-chalk/70 mt-1">Thank you for reaching out. We'll be in touch soon.</p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-start gap-3 bg-danger-red/10 border border-danger-red/30 p-4 mb-6 rounded-sm">
                <AlertCircle size={20} className="text-danger-red flex-shrink-0 mt-0.5" />
                <span className="text-sm text-danger-red">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Full Name"
                  id="contact-name"
                  type="text"
                  placeholder="Jane Mwangi"
                  error={errors.name ? (errors.name.message as string) : undefined}
                  {...register('name', { required: 'Name is required' })}
                />
                <FormInput
                  label="Email Address"
                  id="contact-email"
                  type="email"
                  placeholder="you@example.com"
                  error={errors.email ? (errors.email.message as string) : undefined}
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' }
                  })}
                />
              </div>

              <FormInput
                label="Phone Number"
                id="contact-phone"
                type="tel"
                placeholder="+254 712 345 678"
                error={errors.phone ? (errors.phone.message as string) : undefined}
                {...register('phone', { required: 'Phone is required' })}
              />

              <div>
                <label className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk/40 mb-2.5 block" htmlFor="contact-subject">
                  Subject
                </label>
                <select
                  id="contact-subject"
                  className="w-full bg-ash border border-white/10 text-chalk font-barlow text-base px-4 py-3 outline-none transition-all duration-200 focus:border-fire/50 focus:bg-ash/90 appearance-none cursor-pointer"
                  {...register('subject', { required: 'Please select a subject' })}
                >
                  <option value="">Choose a topic...</option>
                  <option value="event">Event Inquiry</option>
                  <option value="shop">Shop/Merchandise</option>
                  <option value="equipment">Equipment Hire</option>
                  <option value="partnership">Partnership Inquiry</option>
                  <option value="other">Other</option>
                </select>
                {errors.subject && (
                  <p className="text-xs text-danger-red mt-1.5">{errors.subject.message as string}</p>
                )}
              </div>

              <div>
                <label className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk/40 mb-2.5 block" htmlFor="contact-message">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  className="w-full bg-ash border border-white/10 text-chalk font-barlow text-base px-4 py-3 outline-none transition-all duration-200 focus:border-fire/50 focus:bg-ash/90 resize-none"
                  placeholder="Tell us what's on your mind..."
                  {...register('message', { required: 'Message is required', minLength: { value: 10, message: 'Minimum 10 characters' } })}
                />
                {errors.message && (
                  <p className="text-xs text-danger-red mt-1.5">{errors.message.message as string}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                isLoading={loading}
                variant="primary"
                size="lg"
                fullWidth
              >
                Send Message
              </Button>
            </form>
          </div>

          {/* Map or Additional Info */}
          <div className="space-y-8">
            <div className="bg-ash border border-white/10 p-8 h-full flex flex-col justify-between">
              <div>
                <h3 className="font-bebas text-3xl text-fire mb-4 letter-spacing-tighter">
                  Community First
                </h3>
                <p className="text-fog text-sm leading-relaxed mb-6">
                  TRFC isn't just a running club — it's a community of passionate athletes, fitness enthusiasts, and friends who share a love for the sport. Whether you're a seasoned runner or just starting your fitness journey, we're here to support you.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-2">Quick Links</p>
                  <ul className="space-y-2 text-sm text-fog">
                    <li><a href="/events" className="hover:text-fire transition-colors">Upcoming Events</a></li>
                    <li><a href="/shop" className="hover:text-fire transition-colors">TRFC Shop</a></li>
                    <li><a href="/gallery" className="hover:text-fire transition-colors">Community Gallery</a></li>
                    <li><a href="/equipment" className="hover:text-fire transition-colors">Equipment Hire</a></li>
                  </ul>
                </div>

                <div>
                  <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-2">Follow Us</p>
                  <div className="flex gap-3">
                    {['Facebook', 'Instagram', 'Twitter'].map((social) => (
                      <a 
                        key={social}
                        href="#" 
                        className="w-10 h-10 bg-fire/10 hover:bg-fire hover:text-night transition-all duration-300 flex items-center justify-center text-sm font-bold"
                      >
                        {social.charAt(0)}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
=======
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
          <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light">GET IN <span className="text-accent light:text-accent-light">TOUCH</span></h1>
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
              className={`${cardSurface} p-6 flex items-center gap-5 no-underline text-chalk light:text-chalk-light hover:border-accent/30 light:hover:border-accent-light/30 transition group`}
            >
              <div className="w-12 h-12 bg-accent/10 light:bg-accent-light/10 border border-accent/20 light:border-accent-light/20 flex items-center justify-center text-accent light:text-accent-light flex-shrink-0">
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light">{label}</p>
                <p className="font-semibold mt-1">{value}</p>
              </div>
              <ArrowRight size={16} className="text-accent light:text-accent-light opacity-0 group-hover:opacity-100 transition" />
            </a>
          ))}
        </div>

        {siteSocial.length > 0 && (
          <div className={`${cardSurface} p-8 mb-12`}>
            <h2 className="font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4">Follow Us</h2>
            <div className="flex flex-wrap gap-3">
              {siteSocial.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-barlow-condensed font-bold text-xs tracking-widest uppercase px-4 py-2 border border-white/10 light:border-black/10 text-chalk light:text-chalk-light no-underline hover:border-accent light:hover:border-accent-light hover:text-accent light:hover:text-accent-light transition"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className={`${cardSurface} p-8`}>
          <h2 className="font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4">Send a Message</h2>
          <p className="text-fog light:text-fog-light text-sm mb-6">Prefer email? Tap below to open your mail client with our address pre-filled.</p>
          <a
            href={`mailto:${siteContact.email}?subject=TRFC%20Enquiry`}
            className="inline-flex bg-accent light:bg-accent-light text-black light:text-white px-8 py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase no-underline hover:bg-accent/90 light:hover:bg-accent-light/90"
          >
            Email TRFC
          </a>
          <p className="text-xs text-fog light:text-fog-light mt-6">
            New to TRFC? <Link to="/register" className="text-accent light:text-accent-light no-underline hover:underline">Join the community</Link> or browse{' '}
            <Link to="/partnerships" className="text-accent light:text-accent-light no-underline hover:underline">partnership options</Link>.
          </p>
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
        </div>
      </div>
    </div>
  )
}
