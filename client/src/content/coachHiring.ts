import { toKenyanMsisdn } from '../utils/phone'

export const COACH_HIRING_PATH = '/coach-with-us'
export const APPLY_ANCHOR = 'apply'
export const STANDARDS_ANCHOR = 'standards'

export const COACH_HIRING_COPY = {
  documentTitle: 'Coach with us | Thika Road Fitness Community',
  bar: { title: 'Coach with TRFC', cta: 'Apply now' },
  hero: {
    badge: "We're hiring coaches",
    heading: 'Coaches who are ready to outwork themselves, we are hiring.',
    body: 'TRFC is building new programs for runners, walkers and hikers across Nairobi. We need coaches who show up every day, keep learning and help people stick with it.',
    cta: 'See if you are a fit',
    note: 'No log in needed. It takes about 10 minutes and a 1 minute video.',
  },
  doAndLearn: {
    eyebrow: 'The job',
    heading: 'What you will do, and what you will learn',
    do: {
      title: 'What you will do',
      items: [
        'Coach members through TRFC programs, week by week',
        'Lead community runs and sessions on the ground',
        'Check in with your members and answer their questions',
        'Read weekly check-ins and spot who needs a push or a rest',
        'Share honest feedback with the team so the programs get better',
      ],
    },
    learn: {
      title: 'What you will learn',
      items: [
        'How our programs are planned, from Couch to 5K to endurance',
        'How to coach beginners safely and keep them coming back',
        'How to run a group so nobody is left behind',
        'How to use the TRFC dashboard to follow your members',
        'How to give and take feedback like a professional',
      ],
    },
  },
  standards: {
    eyebrow: 'The standard',
    heading: 'Our coaches are people who',
    items: [
      { title: 'Outwork yourself', body: 'You compete with who you were yesterday, not with the people around you.' },
      { title: 'Put in the hours', body: 'You give at least 3 hours every day and you are there when you said you would be.' },
      { title: 'Want to learn', body: 'You ask questions, read, watch and try new things to become a better coach.' },
      { title: 'Play the long game', body: 'You care about where your members are in a year, not just this week.' },
      { title: 'Take feedback', body: 'You hear hard feedback without getting defensive, and you use it.' },
    ],
  },
  howWeChoose: {
    eyebrow: 'How we choose',
    heading: 'Three steps, and we tell you where you stand',
    steps: [
      { title: 'Apply', body: 'Fill in the form below and send us your 1 minute video.' },
      { title: 'We review', body: 'We read every application and watch every video against the five standards.' },
      { title: 'A call', body: 'If you are a fit, we book a call to get to know you and talk about next steps.' },
    ],
    footer: 'Whatever the answer, we will let you know where you stand.',
  },
  form: {
    eyebrow: 'Apply now',
    heading: 'Your application',
    intro: 'Answer honestly. There are no wrong answers, only ones that tell us who you are.',
    submit: 'Submit my application',
    sending: 'Sending...',
    uploading: 'Wait for the video to finish uploading',
  },
  thanks: {
    heading: 'Thank you. We read every application.',
    body: 'We have sent a confirmation to your email. Keep an eye on WhatsApp and your inbox.',
    cta: 'Back to the home page',
  },
}

export const HOUR_OPTIONS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
] as const
export type HourOption = (typeof HOUR_OPTIONS)[number]['id']

export const MAX_VIDEO_BYTES = 150 * 1024 * 1024
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm,video/3gpp,video/x-m4v,.mp4,.mov,.webm,.3gp,.m4v'
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|3gp|m4v)$/i
const VIDEO_MIME = /^video\/(mp4|quicktime|webm|3gpp|x-m4v)$/

export type VideoSource = 'upload' | 'link'

export interface ApplicationForm {
  fullName: string
  phone: string
  email: string
  location: string
  socialUrl: string
  experience: string
  canGive3Hours: boolean | null
  hours: HourOption[]
  workedHarder: string
  videoSource: VideoSource
  uploadUrl: string
  uploadPublicId: string
  linkUrl: string
  agreeStandards: boolean
  agreeStorage: boolean
}

export const EMPTY_FORM: ApplicationForm = {
  fullName: '',
  phone: '',
  email: '',
  location: '',
  socialUrl: '',
  experience: '',
  canGive3Hours: null,
  hours: [],
  workedHarder: '',
  videoSource: 'upload',
  uploadUrl: '',
  uploadPublicId: '',
  linkUrl: '',
  agreeStandards: false,
  agreeStorage: false,
}

export type FormErrors = Partial<Record<keyof ApplicationForm | 'video' | 'form', string>>

const LONG_TEXT_MAX = 3000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Adds https:// to links typed without it, e.g. "instagram.com/me". */
export function withHttps(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value.replace(/^http:\/\//i, 'https://')
  return `https://${value}`
}

export function isHttpsLink(raw: string): boolean {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && url.hostname.includes('.')
  } catch {
    return false
  }
}

export function validateApplication(form: ApplicationForm): FormErrors {
  const errors: FormErrors = {}
  if (!form.fullName.trim()) errors.fullName = 'Please add your full name'
  if (!toKenyanMsisdn(form.phone)) errors.phone = 'Enter a valid WhatsApp number, e.g. 0712 345 678'
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address'
  if (!form.location.trim()) errors.location = 'Please add where you are based'
  if (!isHttpsLink(withHttps(form.socialUrl))) errors.socialUrl = 'Please add a link to your Instagram, TikTok or Facebook'
  if (!form.experience.trim()) errors.experience = 'Please tell us about your coaching'
  else if (form.experience.length > LONG_TEXT_MAX) errors.experience = `Keep this under ${LONG_TEXT_MAX} characters`
  if (form.canGive3Hours === null) errors.canGive3Hours = 'Please choose Yes or No'
  if (form.hours.length === 0) errors.hours = 'Tick at least one time of day'
  if (!form.workedHarder.trim()) errors.workedHarder = 'Please tell us your story'
  else if (form.workedHarder.length > LONG_TEXT_MAX) errors.workedHarder = `Keep this under ${LONG_TEXT_MAX} characters`
  if (form.videoSource === 'upload' && !form.uploadUrl) errors.video = 'Please upload your 1 minute video'
  if (form.videoSource === 'link' && !isHttpsLink(withHttps(form.linkUrl))) errors.video = 'Paste a full link to your video'
  if (!form.agreeStandards) errors.agreeStandards = 'Please confirm you will follow the coach standards'
  if (!form.agreeStorage) errors.agreeStorage = 'Please agree so we can keep your details for hiring'
  return errors
}

/** Null when the file can be uploaded, otherwise the message to show. */
export function videoFileProblem(file: { name: string; type: string; size: number }): string | null {
  if (!VIDEO_MIME.test(file.type) && !VIDEO_EXTENSIONS.test(file.name)) {
    return 'Please choose a video file (MP4, MOV, WebM or 3GP)'
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return 'That video is over 150 MB. Trim it to about 1 minute, or upload it somewhere and paste the link.'
  }
  return null
}

export function toSubmission(form: ApplicationForm, extras: { submissionKey: string; startedAt: number; website: string }) {
  return {
    fullName: form.fullName.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    location: form.location.trim(),
    socialUrl: withHttps(form.socialUrl),
    experience: form.experience.trim(),
    canGive3Hours: form.canGive3Hours,
    hours: form.hours,
    workedHarder: form.workedHarder.trim(),
    video:
      form.videoSource === 'upload'
        ? { source: 'upload' as const, url: form.uploadUrl, publicId: form.uploadPublicId }
        : { source: 'link' as const, url: withHttps(form.linkUrl) },
    agreeStandards: form.agreeStandards,
    agreeStorage: form.agreeStorage,
    ...extras,
  }
}

export type CoachApplicationPayload = ReturnType<typeof toSubmission>

export function scrollToAnchor(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
