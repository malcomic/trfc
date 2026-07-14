import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { AlertCircle, CheckCircle, Mail, MapPin, Phone, MessageCircle } from 'lucide-react'
import { Button, FormInput } from '../components/ui'
import { siteContact, siteSocial } from '../config/site'

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

  const contactCards = [
    { icon: MapPin, title: 'Location', details: [siteContact.location] },
    { icon: Mail, title: 'Email', details: [siteContact.email] },
    { icon: Phone, title: 'Phone', details: [siteContact.phone] },
    { icon: MessageCircle, title: 'WhatsApp', details: ['Chat with us'] },
  ]

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink via-ash to-night border-b border-white/5 px-[6%] py-16 md:py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent light:bg-accent-light rounded-full blur-3xl" style={{ transform: 'translate(50%, -50%)' }} />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent light:bg-accent-light rounded-full blur-3xl" style={{ transform: 'translate(-30%, 30%)' }} />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-accent light:text-accent-light mb-4 before:block before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          {/* Contact Info Cards */}
          {contactCards.map((contact, idx) => {
            const Icon = contact.icon
            return (
              <div key={idx} className="bg-ash border border-white/10 p-6 hover:border-accent/30 light:hover:border-accent-light/30 transition-all duration-300 group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/10 light:bg-accent-light/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 light:group-hover:bg-accent-light/20 transition-colors duration-300">
                    <Icon size={20} className="text-accent light:text-accent-light" />
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
                  className="w-full bg-ash border border-white/10 text-chalk font-barlow text-base px-4 py-3 outline-none transition-all duration-200 focus:border-accent/50 light:focus:border-accent-light/50 focus:bg-ash/90 appearance-none cursor-pointer"
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
                  className="w-full bg-ash border border-white/10 text-chalk font-barlow text-base px-4 py-3 outline-none transition-all duration-200 focus:border-accent/50 light:focus:border-accent-light/50 focus:bg-ash/90 resize-none"
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
                <h3 className="font-bebas text-3xl text-accent light:text-accent-light mb-4 letter-spacing-tighter">
                  Community First
                </h3>
                <p className="text-fog text-sm leading-relaxed mb-6">
                  TRFC isn't just a running club — it's a community of passionate athletes, fitness enthusiasts, and friends who share a love for the sport. Whether you're a seasoned runner or just starting your fitness journey, we're here to support you.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-accent light:text-accent-light mb-2">Quick Links</p>
                  <ul className="space-y-2 text-sm text-fog">
                    <li><a href="/events" className="hover:text-accent light:hover:text-accent-light transition-colors">Upcoming Events</a></li>
                    <li><a href="/shop" className="hover:text-accent light:hover:text-accent-light transition-colors">TRFC Shop</a></li>
                    <li><a href="/gallery" className="hover:text-accent light:hover:text-accent-light transition-colors">Community Gallery</a></li>
                    <li><a href="/equipment" className="hover:text-accent light:hover:text-accent-light transition-colors">Equipment Hire</a></li>
                  </ul>
                </div>

                {siteSocial.length > 0 && (
                  <div>
                    <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-accent light:text-accent-light mb-2">Follow Us</p>
                    <div className="flex gap-3">
                      {siteSocial.map((s) => (
                        <a
                          key={s.label}
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-accent/10 light:bg-accent-light/10 hover:bg-accent light:hover:bg-accent-light hover:text-night transition-all duration-300 flex items-center justify-center text-sm font-bold"
                        >
                          {s.label.charAt(0)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
