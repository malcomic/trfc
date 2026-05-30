import { useEffect, useState } from 'react'
import { getTestimonials, submitTestimonial, Testimonial } from '../api/testimonials'
import { AlertCircle, Loader, Star, CheckCircle } from 'lucide-react'

export default function Testimonials() {
  const [list, setList] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    getTestimonials()
      .then(setList)
      .catch(() => setError('Failed to load testimonials'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !message.trim()) {
      setSubmitError('Name and message are required')
      return
    }
    try {
      setSubmitting(true)
      setSubmitError('')
      await submitTestimonial({ member_name: name.trim(), message: message.trim(), rating })
      setSubmitted(true)
      setName('')
      setMessage('')
      setRating(5)
    } catch {
      setSubmitError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow">
      <section className="bg-ink border-b border-white/5 px-[6%] pt-14 pb-11">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-bebas text-5xl">COMMUNITY <span className="text-fire">VOICES</span></h1>
          <p className="text-fog mt-2">Stories from TRFC members</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {loading && <Loader className="animate-spin text-fire mx-auto" />}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 flex gap-2 text-red-300 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {!loading && !error && list.length === 0 && (
            <p className="text-fog">No testimonials yet — be the first to share yours.</p>
          )}
          <div className="space-y-4">
            {list.map((t) => (
              <div key={t.id} className="bg-ash border border-white/5 p-6">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < t.rating ? 'text-fire fill-fire' : 'text-fog'} />
                  ))}
                </div>
                <p className="text-chalk/90 leading-relaxed mb-4">&ldquo;{t.message}&rdquo;</p>
                <p className="font-barlow-condensed font-bold text-fire text-sm">{t.member_name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-ash border border-white/5 p-6 h-fit sticky top-20">
          <h2 className="font-barlow-condensed font-bold text-fire letter-spacing-widest text-transform-uppercase mb-4">Share Your Story</h2>
          {submitted ? (
            <div className="flex gap-3 text-green-400 text-sm">
              <CheckCircle size={18} className="flex-shrink-0" />
              <p>Thank you! Your testimonial will appear after admin approval.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-smoke border border-white/10 px-3 py-2 text-chalk text-sm focus:outline-none focus:border-fire"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your experience with TRFC…"
                rows={4}
                className="w-full bg-smoke border border-white/10 px-3 py-2 text-chalk text-sm focus:outline-none focus:border-fire resize-none"
              />
              <div>
                <label className="text-xs text-fog block mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)} className="bg-transparent border-0 cursor-pointer p-0">
                      <Star size={20} className={n <= rating ? 'text-fire fill-fire' : 'text-fog'} />
                    </button>
                  ))}
                </div>
              </div>
              {submitError && <p className="text-red-400 text-xs">{submitError}</p>}
              <button type="submit" disabled={submitting} className="w-full bg-fire text-white py-2.5 clip-angled font-barlow-condensed font-black text-xs letter-spacing-widest text-transform-uppercase hover:bg-ember disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
