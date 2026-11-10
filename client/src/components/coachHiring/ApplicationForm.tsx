import { FormEvent, ReactNode, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { submitCoachApplication } from '../../api/coachApplications'
import {
  APPLY_ANCHOR,
  COACH_HIRING_COPY,
  EMPTY_FORM,
  HOUR_OPTIONS,
  STANDARDS_ANCHOR,
  scrollToAnchor,
  toSubmission,
  validateApplication,
  type ApplicationForm as FormState,
  type FormErrors,
  type HourOption,
} from '../../content/coachHiring'
import { cardSurface, inputField } from '../../utils/themeClasses'
import CtaButton from '../programs/CtaButton'
import SectionHeading from '../programs/SectionHeading'
import CvField from './CvField'
import VideoField from './VideoField'

const fieldInput = `${inputField} w-full min-h-[48px] px-4 rounded-lg text-lg`
const errorText = 'm-0 text-base text-red-400 light:text-red-600'

function newSubmissionKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {hint && <p className="m-0 text-base text-fog light:text-fog-light">{hint}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} className={errorText} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const chipClass = (active: boolean) =>
  `inline-flex items-center justify-center min-h-[44px] px-5 rounded-full border font-semibold text-base transition-colors ${
    active
      ? 'bg-cta border-cta text-cta-ink'
      : 'border-white/20 light:border-black/15 text-chalk light:text-chalk-light hover:border-cta'
  }`

function ThankYou() {
  const copy = COACH_HIRING_COPY.thanks
  return (
    <div className={`${cardSurface} rounded-2xl p-8 md:p-10 flex flex-col items-center text-center gap-4`} role="status">
      <CheckCircle2 size={48} className="text-cta" aria-hidden="true" />
      <h3 className="m-0 font-barlow-condensed font-bold text-[28px] md:text-[34px] leading-tight text-chalk light:text-chalk-light">
        {copy.heading}
      </h3>
      <p className="m-0 max-w-[520px] text-fog light:text-fog-light">{copy.body}</p>
      <CtaButton to="/" size="sm">
        {copy.cta}
      </CtaButton>
    </div>
  )
}

export default function ApplicationForm() {
  const copy = COACH_HIRING_COPY.form
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingCv, setUploadingCv] = useState(false)
  const uploading = uploadingVideo || uploadingCv
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [website, setWebsite] = useState('')
  const startedAt = useRef(Date.now())
  const submissionKey = useRef(newSubmissionKey())

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => {
      const errorKey =
        key === 'uploadUrl' || key === 'linkUrl' || key === 'videoSource' ? 'video' : key === 'cvUrl' ? 'cv' : key
      if (!e[errorKey as keyof FormErrors] && !e.form) return e
      const next = { ...e }
      delete next[errorKey as keyof FormErrors]
      delete next.form
      return next
    })
  }

  const toggleHour = (hour: HourOption) =>
    update('hours', form.hours.includes(hour) ? form.hours.filter((h) => h !== hour) : [...form.hours, hour])

  const focusFirstError = (found: FormErrors) => {
    const first = Object.keys(found)[0]
    const target = first === 'video' ? 'video-field' : first === 'cv' ? 'cv-field' : first
    requestAnimationFrame(() => {
      const el = document.getElementById(target)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.focus({ preventScroll: true })
    })
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (sending || uploading) return
    const found = validateApplication(form)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      focusFirstError(found)
      return
    }
    setSending(true)
    try {
      await submitCoachApplication(
        toSubmission(form, { submissionKey: submissionKey.current, startedAt: startedAt.current, website })
      )
      setSent(true)
      scrollToAnchor(APPLY_ANCHOR)
    } catch (err: any) {
      const data = err?.response?.data
      const serverErrors: FormErrors = data?.errors ?? {}
      const message =
        err?.response?.status === 429
          ? 'Too many tries. Please wait a few minutes and send again.'
          : data?.error || 'We could not send your application. Check your connection and try again.'
      setErrors({ ...serverErrors, form: message })
      if (Object.keys(serverErrors).length > 0) focusFirstError(serverErrors)
    } finally {
      setSending(false)
    }
  }

  return (
    <section id={APPLY_ANCHOR} className="scroll-mt-32 bg-night light:bg-night-light px-4 md:px-6 py-12 md:py-[72px]">
      <div className="max-w-[760px] mx-auto flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <SectionHeading>{copy.heading}</SectionHeading>
          {!sent && <p className="m-0 text-fog light:text-fog-light">{copy.intro}</p>}
        </div>

        {sent ? (
          <ThankYou />
        ) : (
          <form onSubmit={onSubmit} noValidate className={`${cardSurface} relative overflow-hidden rounded-2xl p-5 md:p-8 flex flex-col gap-6`}>
            <div className="absolute -left-[10000px] w-px h-px overflow-hidden" aria-hidden="true">
              <label htmlFor="website">Leave this empty</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field id="fullName" label="Full name" error={errors.fullName}>
                <input id="fullName" autoComplete="name" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className={fieldInput} aria-invalid={Boolean(errors.fullName)} />
              </Field>
              <Field id="phone" label="Phone number (WhatsApp)" error={errors.phone}>
                <input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={form.phone} onChange={(e) => update('phone', e.target.value)} className={fieldInput} aria-invalid={Boolean(errors.phone)} />
              </Field>
              <Field id="email" label="Email address" error={errors.email}>
                <input id="email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={fieldInput} aria-invalid={Boolean(errors.email)} />
              </Field>
              <Field id="location" label="Where are you based?" error={errors.location}>
                <input id="location" placeholder="e.g. Roysambu" value={form.location} onChange={(e) => update('location', e.target.value)} className={fieldInput} aria-invalid={Boolean(errors.location)} />
              </Field>
            </div>

            <Field id="socialUrl" label="Link to your Instagram, TikTok or Facebook" error={errors.socialUrl}>
              <input id="socialUrl" type="url" inputMode="url" placeholder="instagram.com/yourname" value={form.socialUrl} onChange={(e) => update('socialUrl', e.target.value)} className={fieldInput} aria-invalid={Boolean(errors.socialUrl)} />
            </Field>

            <Field id="experience" label="How long have you been coaching, and who have you coached?" error={errors.experience}>
              <textarea id="experience" rows={5} value={form.experience} onChange={(e) => update('experience', e.target.value)} className={`${fieldInput} py-3`} aria-invalid={Boolean(errors.experience)} />
            </Field>

            <fieldset className="m-0 p-0 border-0 flex flex-col gap-2">
              <legend className="font-semibold mb-1.5">Can you give at least 3 hours every day?</legend>
              <div id="canGive3Hours" className="flex gap-2" role="radiogroup">
                {[
                  { value: true, label: 'Yes' },
                  { value: false, label: 'No' },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    role="radio"
                    aria-checked={form.canGive3Hours === option.value}
                    onClick={() => update('canGive3Hours', option.value)}
                    className={chipClass(form.canGive3Hours === option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {errors.canGive3Hours && <p className={errorText} role="alert">{errors.canGive3Hours}</p>}
            </fieldset>

            <fieldset className="m-0 p-0 border-0 flex flex-col gap-2">
              <legend className="font-semibold mb-1.5">Which hours can you give? Tick any.</legend>
              <div id="hours" className="flex flex-wrap gap-2">
                {HOUR_OPTIONS.map((hour) => (
                  <button
                    key={hour.id}
                    type="button"
                    aria-pressed={form.hours.includes(hour.id)}
                    onClick={() => toggleHour(hour.id)}
                    className={chipClass(form.hours.includes(hour.id))}
                  >
                    {hour.label}
                  </button>
                ))}
              </div>
              {errors.hours && <p className={errorText} role="alert">{errors.hours}</p>}
            </fieldset>

            <Field id="workedHarder" label="Tell us about a time you worked harder than anyone around you." error={errors.workedHarder}>
              <textarea id="workedHarder" rows={5} value={form.workedHarder} onChange={(e) => update('workedHarder', e.target.value)} className={`${fieldInput} py-3`} aria-invalid={Boolean(errors.workedHarder)} />
            </Field>

            <div id="video-field">
              <VideoField
                source={form.videoSource}
                uploadedUrl={form.uploadUrl}
                linkUrl={form.linkUrl}
                error={errors.video}
                onSourceChange={(source) => update('videoSource', source)}
                onUploaded={(video) => {
                  update('uploadUrl', video?.url ?? '')
                  update('uploadPublicId', video?.publicId ?? '')
                }}
                onLinkChange={(url) => update('linkUrl', url)}
                onUploadingChange={setUploadingVideo}
              />
            </div>

            <div id="cv-field">
              <CvField
                fileName={form.cvFileName}
                uploaded={Boolean(form.cvUrl)}
                error={errors.cv}
                onUploaded={(cv) => {
                  update('cvUrl', cv?.url ?? '')
                  update('cvPublicId', cv?.publicId ?? '')
                  update('cvFileName', cv?.fileName ?? '')
                }}
                onUploadingChange={setUploadingCv}
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input id="agreeStandards" type="checkbox" checked={form.agreeStandards} onChange={(e) => update('agreeStandards', e.target.checked)} className="mt-1 w-5 h-5 accent-cta flex-shrink-0" />
                <span>
                  I have read the{' '}
                  <a href={`#${STANDARDS_ANCHOR}`} onClick={(e) => { e.preventDefault(); scrollToAnchor(STANDARDS_ANCHOR) }} className="underline">
                    coach standards
                  </a>{' '}
                  and I agree to follow them.
                </span>
              </label>
              {errors.agreeStandards && <p className={errorText} role="alert">{errors.agreeStandards}</p>}
              <label className="flex items-start gap-3 cursor-pointer">
                <input id="agreeStorage" type="checkbox" checked={form.agreeStorage} onChange={(e) => update('agreeStorage', e.target.checked)} className="mt-1 w-5 h-5 accent-cta flex-shrink-0" />
                <span>I agree that TRFC may store my details for hiring.</span>
              </label>
              {errors.agreeStorage && <p className={errorText} role="alert">{errors.agreeStorage}</p>}
            </div>

            {errors.form && (
              <p className="m-0 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-base text-red-300 light:text-red-700" role="alert">
                {errors.form}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={sending || uploading}
                className="inline-flex items-center justify-center gap-2 min-h-[56px] px-8 rounded-lg font-barlow font-semibold text-lg bg-cta text-cta-ink hover:bg-cta/90 transition-colors disabled:bg-smoke light:disabled:bg-smoke-light disabled:text-fog light:disabled:text-fog-light disabled:cursor-not-allowed"
              >
                {sending ? copy.sending : copy.submit}
              </button>
              {uploading && (
                <p className="m-0 text-base text-fog light:text-fog-light text-center">
                  {uploadingVideo ? copy.uploading : copy.uploadingCv}
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  )
}