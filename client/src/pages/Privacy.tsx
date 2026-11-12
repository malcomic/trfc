import { useEffect, useState } from 'react'
import PolicyPage from '../components/policy/PolicyPage'
import { getPublicPrivacySettings } from '../api/policies'

function Notice({ id, title, text }: { id: string; title: string; text: string }) {
  return (
    <section id={id}>
      <h2 className="font-bebas text-3xl text-chalk light:text-chalk-light mb-4">{title}</h2>
      <p className="text-fog light:text-fog-light leading-relaxed text-sm md:text-base">{text}</p>
    </section>
  )
}

export default function Privacy() {
  const [crossBorder, setCrossBorder] = useState('')
  const [ticketPhoto, setTicketPhoto] = useState('')
  useEffect(() => {
    getPublicPrivacySettings()
      .then((settings) => {
        setCrossBorder(settings.cross_border_notice ?? '')
        setTicketPhoto(settings.show_ticket_photo_notice ? settings.ticket_photo_notice ?? '' : '')
      })
      .catch(() => {})
  }, [])

  return (
    <PolicyPage slug="privacy-members" watermark="PRIVACY" alsoShow="terms" crossLink={{ label: 'Terms', to: '/terms' }}>
      {ticketPhoto && <Notice id="ticket-photos" title="Photos on tickets" text={ticketPhoto} />}
      {crossBorder && <Notice id="data-leaving-kenya" title="Data that leaves Kenya" text={crossBorder} />}
    </PolicyPage>
  )
}
