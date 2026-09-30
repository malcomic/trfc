import { useState, type FormEvent } from 'react'
import { CONTACT_COPY, toKenyanMsisdn } from '../../content/onboarding'
import { ErrorNote, PrimaryButton, StepShell, StepTitle } from './ui'

export interface ContactValues {
  name: string
  phone: string
  whatsapp: string
}

const fieldClass =
  'w-full bg-white/5 border border-white/20 text-white placeholder:text-white/40 px-4 py-3.5 text-base focus:outline-none focus:border-accent transition-colors'
const labelClass =
  'block font-barlow-condensed font-bold text-xs tracking-widest uppercase text-white/70 mb-1.5'

export default function ContactForm({
  eyebrow,
  initial,
  submitting,
  serverError,
  onSubmit,
  onBack,
}: {
  eyebrow: string
  initial: ContactValues
  submitting: boolean
  serverError: string
  onSubmit: (values: ContactValues) => void
  onBack: () => void
}) {
  const [values, setValues] = useState<ContactValues>(initial)
  const [error, setError] = useState('')

  const update = (key: keyof ContactValues, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const copyPhoneToWhatsapp = () => {
    if (!values.whatsapp && values.phone) update('whatsapp', values.phone)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!values.name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!toKenyanMsisdn(values.phone)) {
      setError('Enter a valid phone number, e.g. 0712 345 678. This is where the M-Pesa prompt goes.')
      return
    }
    const whatsapp = values.whatsapp.trim() || values.phone
    if (!toKenyanMsisdn(whatsapp)) {
      setError('Enter a valid WhatsApp number, e.g. 0712 345 678.')
      return
    }
    onSubmit({ name: values.name.trim(), phone: values.phone, whatsapp })
  }

  return (
    <StepShell eyebrow={eyebrow} onBack={onBack}>
      <StepTitle>Where do we reach you?</StepTitle>
      <form onSubmit={handleSubmit} className="space-y-4 mt-6" noValidate>
        <div>
          <label htmlFor="onb-name" className={labelClass}>{CONTACT_COPY.name.label}</label>
          <input
            id="onb-name"
            type="text"
            autoComplete="name"
            className={fieldClass}
            placeholder={CONTACT_COPY.name.placeholder}
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="onb-phone" className={labelClass}>{CONTACT_COPY.phone.label}</label>
          <input
            id="onb-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={fieldClass}
            placeholder={CONTACT_COPY.phone.placeholder}
            value={values.phone}
            onChange={(e) => update('phone', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="onb-whatsapp" className={labelClass}>{CONTACT_COPY.whatsapp.label}</label>
          <input
            id="onb-whatsapp"
            type="tel"
            inputMode="tel"
            className={fieldClass}
            placeholder={CONTACT_COPY.whatsapp.placeholder}
            value={values.whatsapp}
            onFocus={copyPhoneToWhatsapp}
            onClick={copyPhoneToWhatsapp}
            onChange={(e) => update('whatsapp', e.target.value)}
          />
        </div>

        <ErrorNote message={error || serverError} />

        <PrimaryButton type="submit" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? 'Please wait…' : CONTACT_COPY.button}
        </PrimaryButton>
      </form>
    </StepShell>
  )
}
